import React from "react"
import { screen } from "@testing-library/react"
import { render } from "./test-utils"
import { App } from "./App"

test("renders the game board", () => {
  render(<App />)
  expect(screen.getByRole("button", { name: /rows? left/i })).toBeInTheDocument()
})
