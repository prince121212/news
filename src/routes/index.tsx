import { createFileRoute } from "@tanstack/react-router"
import { AiHotApp } from "~/components/aihot"

export const Route = createFileRoute("/")({
  component: IndexComponent,
})

function IndexComponent() {
  return <AiHotApp />
}
