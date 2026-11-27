from datetime import date, datetime, time, timedelta

from django.core.exceptions import ImproperlyConfigured
from django.db import connection
from django.test import SimpleTestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.traces.models import Trace

from . import content, crypto
from .models import Notebook, Page


def doc(*paragraphs, marks=None):
    """Un documento del editor con un párrafo por texto."""
    return {
        "type": "doc",
        "content": [
            {"type": "paragraph", "content": [{"type": "text", "text": text, **({"marks": marks} if marks else {})}]}
            for text in paragraphs
        ],
    }


class DiaryTests(APITestCase):
    """HU17: escribir en mi Cuadernillo."""

    def setUp(self):
        self.user = User.objects.create_user(email="diario@example.com", password="UnaClaveSegura!2026", date_of_birth=date(1990, 1, 1))
        self.client.force_authenticate(self.user)

    def notebook(self, **extra):
        return self.client.post("/api/v1/diary/notebooks/", {"title": "Mi diario", "cover": "oliva", "paper": "dots", **extra}, format="json")

    def page(self, notebook_id, **extra):
        return self.client.post(f"/api/v1/diary/notebooks/{notebook_id}/pages/", extra, format="json")

    # Escenario 1
    def test_scenario_1_a_notebook_appears_on_my_shelf_and_i_can_write_in_it(self):
        created = self.notebook()
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        self.assertEqual({key: created.data[key] for key in ("title", "cover", "paper", "page_count")}, {"title": "Mi diario", "cover": "oliva", "paper": "dots", "page_count": 0})

        page = self.page(created.data["id"], font="kalam", ink="azul", content=doc("Hoy olía a café."))

        self.assertEqual(page.status_code, status.HTTP_201_CREATED)
        self.assertEqual((page.data["font"], page.data["ink"], page.data["text"], page.data["day"]), ("kalam", "azul", "Hoy olía a café.", timezone.localdate().isoformat()))
        shelf = self.client.get("/api/v1/diary/notebooks/").data
        self.assertEqual([(item["title"], item["page_count"]) for item in shelf], [("Mi diario", 1)])

    def test_scenario_1_title_and_choices_are_validated(self):
        for extra, field in [({"title": "  "}, "title"), ({"cover": "neon"}, "cover"), ({"paper": "papiro"}, "paper")]:
            with self.subTest(field=field):
                response = self.notebook(**extra)
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn(field, response.data)
        notebook = Notebook.objects.create(user=self.user, title="Diario")
        for extra, field in [({"font": "comic"}, "font"), ({"ink": "neón"}, "ink"), ({"content": {"type": "otro"}}, "content"), ({"content": "texto"}, "content")]:
            with self.subTest(field=field):
                self.assertIn(field, self.page(notebook.pk, **extra).data)

    def test_scenario_1_rename_change_cover_and_delete_a_notebook(self):
        notebook_id = self.notebook().data["id"]
        self.page(notebook_id, content=doc("Algo"))
        response = self.client.patch(f"/api/v1/diary/notebooks/{notebook_id}/", {"title": "Viajes", "cover": "azul"}, format="json")
        self.assertEqual((response.data["title"], response.data["cover"]), ("Viajes", "azul"))
        self.assertEqual(self.client.delete(f"/api/v1/diary/notebooks/{notebook_id}/").status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Page.objects.exists())

    # Escenario 2
    def test_scenario_2_what_i_wrote_is_kept_with_its_paper_font_and_ink(self):
        notebook_id = self.notebook().data["id"]
        page_id = self.page(notebook_id).data["id"]
        written = doc("La tarde de lluvia", "con mi hermana.", marks=[{"type": "highlight", "attrs": {"color": "#ffe08a"}}, {"type": "underline"}])

        response = self.client.patch(f"/api/v1/diary/pages/{page_id}/", {"content": written, "paper": "grid", "font": "patrick", "ink": "vino"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        again = self.client.get(f"/api/v1/diary/pages/{page_id}/").data
        self.assertEqual(again["content"], written)
        self.assertEqual((again["paper"], again["font"], again["ink"], again["text"]), ("grid", "patrick", "vino", "La tarde de lluvia\ncon mi hermana."))

    def test_scenario_2_the_page_shows_the_dominant_emotion_of_its_day(self):
        notebook_id = self.notebook().data["id"]
        yesterday = timezone.localdate() - timedelta(days=1)
        moment = timezone.make_aware(datetime.combine(yesterday, time(10)))
        for emotion in ["calma", "calma", "alegria"]:
            Trace.objects.create(user=self.user, sensory_type="aroma", note="x", emotion=emotion, mood_intensity=3, happened_at=moment)
        with_traces = self.page(notebook_id, day=yesterday.isoformat()).data
        without = self.page(notebook_id, day=(yesterday - timedelta(days=3)).isoformat()).data

        self.assertEqual((with_traces["day_emotion"], without["day_emotion"]), ("calma", None))
        listed = self.client.get(f"/api/v1/diary/notebooks/{notebook_id}/pages/").data
        self.assertEqual([page["day_emotion"] for page in listed], [None, "calma"])

    def test_the_text_is_stored_encrypted(self):
        notebook_id = self.notebook().data["id"]
        page_id = self.page(notebook_id, content=doc("Un secreto de mi diario")).data["id"]
        with connection.cursor() as cursor:
            cursor.execute("SELECT content FROM diary_page WHERE id = %s", [page_id.replace("-", "")])
            stored = cursor.fetchone()[0]
        self.assertNotIn("secreto", stored)
        self.assertTrue(stored.startswith("gAAAA"))
        self.assertEqual(Page.objects.get(pk=page_id).content.count("secreto"), 1)

    def test_a_page_cannot_be_huge(self):
        notebook_id = self.notebook().data["id"]
        response = self.page(notebook_id, content=doc("x" * 20_001))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    # Privacidad
    def test_only_my_notebooks_and_pages(self):
        other = User.objects.create_user(email="otra@example.com", password="UnaClaveSegura!2026", date_of_birth=date(1990, 1, 1))
        theirs = Notebook.objects.create(user=other, title="Ajeno")
        their_page = Page.objects.create(notebook=theirs, user=other, content='{"type":"doc","content":[]}')

        self.assertEqual(self.client.get("/api/v1/diary/notebooks/").data, [])
        for method, url in [
            ("get", f"/api/v1/diary/notebooks/{theirs.pk}/pages/"),
            ("post", f"/api/v1/diary/notebooks/{theirs.pk}/pages/"),
            ("get", f"/api/v1/diary/pages/{their_page.pk}/"),
            ("patch", f"/api/v1/diary/pages/{their_page.pk}/"),
            ("delete", f"/api/v1/diary/pages/{their_page.pk}/"),
        ]:
            with self.subTest(method=method, url=url):
                self.assertEqual(getattr(self.client, method)(url, {}, format="json").status_code, status.HTTP_404_NOT_FOUND)

    def test_needs_a_session(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get("/api/v1/diary/notebooks/").status_code, status.HTTP_401_UNAUTHORIZED)

    def test_the_export_includes_my_diary_and_deleting_the_account_removes_it(self):
        notebook_id = self.notebook().data["id"]
        self.page(notebook_id, content=doc("Querido diario"))

        exported = self.client.get("/api/v1/auth/export/").data["diary"]

        self.assertEqual(exported[0]["title"], "Mi diario")
        self.assertEqual(exported[0]["pages"][0]["text"], "Querido diario")
        self.user.delete()
        self.assertFalse(Page.objects.exists())

    @override_settings(EVOCA_DIARY_KEY="", DEBUG=False)
    def test_without_the_key_in_production_it_says_so_without_data(self):
        notebook = Notebook.objects.create(user=self.user, title="Diario")
        for method, url in [("get", "/api/v1/diary/notebooks/"), ("post", f"/api/v1/diary/notebooks/{notebook.pk}/pages/")]:
            with self.subTest(url=url):
                response = getattr(self.client, method)(url, {"content": doc("Hola")}, format="json")
                self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
                self.assertNotIn("Diario", str(response.data))
        self.assertFalse(Page.objects.exists())


class DiaryContentTests(SimpleTestCase):
    def test_plain_text_joins_paragraphs_and_breaks(self):
        document = {
            "type": "doc",
            "content": [
                {"type": "paragraph", "content": [{"type": "text", "text": "Hola"}, {"type": "hardBreak"}, {"type": "text", "text": "mundo"}]},
                {"type": "bulletList", "content": [{"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "uno"}]}]}]},
            ],
        }
        self.assertEqual(content.plain_text(document), "Hola\nmundo\nuno")

    def test_broken_stored_json_is_an_empty_page(self):
        self.assertEqual(content.load("{roto"), content.EMPTY)
        self.assertEqual(content.load(""), content.EMPTY)

    @override_settings(EVOCA_DIARY_KEY="", DEBUG=True, SECRET_KEY="otra")
    def test_in_development_the_key_comes_from_the_secret_key(self):
        self.assertEqual(crypto.decrypt(crypto.encrypt("hola")), "hola")

    def test_a_changed_key_is_reported(self):
        token = crypto.encrypt("hola")
        with override_settings(EVOCA_DIARY_KEY="", DEBUG=True, SECRET_KEY="distinta"), self.assertRaises(ImproperlyConfigured):
            crypto.decrypt(token)
