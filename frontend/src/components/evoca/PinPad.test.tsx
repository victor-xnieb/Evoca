import { act, fireEvent, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { renderWithProviders } from "@/test/render"

import { PinPad } from "./PinPad"

describe("PinPad", () => {
  afterEach(() => vi.useRealTimers())

  it("entrega el PIN al completar los 4 dígitos", async () => {
    const onComplete = vi.fn()
    renderWithProviders(<PinPad onComplete={onComplete} />)

    for (const digit of ["1", "9", "0", "4"]) {
      await userEvent.click(screen.getByRole("button", { name: digit }))
    }

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledWith("1904")
    expect(screen.getByRole("status")).toHaveAccessibleName("4 de 4 dígitos ingresados")
  })

  it("acepta el teclado físico y permite borrar", async () => {
    const onComplete = vi.fn()
    renderWithProviders(<PinPad onComplete={onComplete} />)

    await userEvent.keyboard("12{Backspace}34")
    expect(screen.getByRole("status")).toHaveAccessibleName("3 de 4 dígitos ingresados")
    await userEvent.keyboard("5")
    expect(onComplete).toHaveBeenCalledWith("1345")
  })

  it("al recibir un error lo anuncia y vacía la entrada", async () => {
    const { rerender } = renderWithProviders(<PinPad onComplete={() => {}} />)
    await userEvent.keyboard("1111")

    rerender(<PinPad onComplete={() => {}} error="PIN incorrecto. Te quedan 4 intentos." errorKey={1} />)

    expect(screen.getByRole("alert")).toHaveTextContent("PIN incorrecto. Te quedan 4 intentos.")
    expect(screen.getByRole("status")).toHaveAccessibleName("0 de 4 dígitos ingresados")
  })

  it("durante el bloqueo deshabilita el teclado y muestra la cuenta regresiva", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-11-05T10:00:00Z"))
    const onComplete = vi.fn()
    const onUnlock = vi.fn()
    renderWithProviders(
      <PinPad
        onComplete={onComplete}
        onUnlock={onUnlock}
        lockedUntil={new Date("2026-11-05T10:05:00Z")}
      />,
    )

    expect(screen.getByText("5:00")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "1" })).toBeDisabled()
    fireEvent.keyDown(window, { key: "1" })
    expect(screen.getByRole("status")).toHaveAccessibleName("0 de 4 dígitos ingresados")

    act(() => vi.advanceTimersByTime(60_000))
    expect(screen.getByText("4:00")).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(4 * 60_000))
    expect(onUnlock).toHaveBeenCalled()
  })

  it("ofrece huella o rostro solo si se activó", async () => {
    const onBiometric = vi.fn()
    const { rerender } = renderWithProviders(<PinPad onComplete={() => {}} />)
    expect(screen.queryByRole("button", { name: "Usar huella o rostro" })).not.toBeInTheDocument()

    rerender(<PinPad onComplete={() => {}} onBiometric={onBiometric} />)
    await userEvent.click(screen.getByRole("button", { name: "Usar huella o rostro" }))
    expect(onBiometric).toHaveBeenCalled()
  })
})
