import type { Metadata } from "next";
import { Chat } from "@/components/Chat";
import { Container, PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Ask",
  description:
    "Ask questions about Cupertino city government and get answers grounded in the city's own meeting records.",
};

export default function AssistantPage() {
  return (
    <>
      <PageHeader
        eyebrow="Assistant"
        title="Ask about Cupertino"
        intro="A question box for the things that are hard to look up: when a body meets, what it decided, who represents you, and how to be heard."
      />
      <Container className="py-12">
        <Chat />
      </Container>
    </>
  );
}
