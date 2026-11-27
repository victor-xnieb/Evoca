import type { Meta, StoryObj } from "@storybook/react-vite"
import { fn } from "storybook/test"

import { NotebookCover } from "./NotebookCover"

import "@/styles/diary.css"

const meta = {
  title: "Evoca/NotebookCover",
  component: NotebookCover,
  parameters: {
    docs: {
      description: {
        component:
          "Un cuaderno en la estantería del Cuadernillo (HU17): portada con textura de tela, su color, su título y una cinta marcador. Su nombre accesible dice el título, el papel y cuántas páginas tiene.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="w-44">
        <Story />
      </div>
    ),
  ],
  args: { notebook: { title: "Mi diario", cover: "terracota", paper: "lined", page_count: 3 }, onOpen: fn() },
} satisfies Meta<typeof NotebookCover>

export default meta
type Story = StoryObj<typeof meta>

export const Terracota: Story = {}

export const AzulNoche: Story = { name: "Azul noche", args: { notebook: { title: "Viajes", cover: "azul", paper: "dots", page_count: 0 } } }

export const TituloLargo: Story = {
  name: "Título largo",
  args: { notebook: { title: "Cartas que nunca envié a mi abuela", cover: "ciruela", paper: "blank", page_count: 12 } },
}
