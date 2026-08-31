import { createFileRoute } from "@tanstack/react-router";
import { SimApp } from "@/components/sim-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <SimApp />;
}
