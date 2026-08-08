import React from "react"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { render } from "./test-utils"
import { App } from "./App"

test("starts a run from the title screen", async () => {
  const user = userEvent.setup()
  render(<App />)

  const startButton = await screen.findByRole("button", { name: /standard run/i })
  await user.click(startButton)

  expect(await screen.findByRole("button", { name: /rows? left/i })).toBeInTheDocument()
})
