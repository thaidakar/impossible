import React from "react"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { render } from "./test-utils"
import { App } from "./App"

test("renders the game board", () => {
  render(<App />)
  expect(screen.getByRole("button", { name: /rows? left/i })).toBeInTheDocument()
})

test("pressing Space on the focused deal button draws only one row", async () => {
  const user = userEvent.setup()
  render(<App />)
  const dealButton = screen.getByRole("button", { name: "9 rows left" })

  dealButton.focus()
  await user.keyboard(" ")

  expect(screen.getByRole("button", { name: "8 rows left" })).toBeInTheDocument()
})
