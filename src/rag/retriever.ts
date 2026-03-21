import { similaritySearch } from "./vectorStore";
import { getCachedDocs } from "./ingestor";
import { Document } from "@langchain/core/documents";
import { logger } from "@/lib/logger";

export async function retrieveContext(
  query: string,
  k = 5
): Promise<string> {
  try {
    const docs: Document[] = await similaritySearch(query, k);
    if (docs.length > 0) {
      return docs
        .map(
          (doc: Document, i: number) =>
            `[${i + 1}] ${doc.pageContent} (${doc.metadata.time || doc.metadata.scraped_at})`
        )
        .join("\n\n");
    }
  } catch (error) {
    logger.warn("Vector search failed, using keyword fallback");
  }

  // Keyword fallback — no embeddings needed
  const keywords = query.toLowerCase().split(" ");
  const allDocs = getCachedDocs();

  const matched = allDocs
    .filter((doc: Document) =>
      keywords.some((kw) => doc.pageContent.toLowerCase().includes(kw))
    )
    .slice(0, k);

  if (matched.length === 0) {
    const fallback = allDocs.slice(0, k);
    if (fallback.length === 0) return "No relevant recent tweets found.";
    return fallback
      .map((doc: Document, i: number) => `[${i + 1}] ${doc.pageContent}`)
      .join("\n\n");
  }

  return matched
    .map(
      (doc: Document, i: number) =>
        `[${i + 1}] ${doc.pageContent} (${doc.metadata.time || doc.metadata.scraped_at})`
    )
    .join("\n\n");
}

export async function retrieveGeopoliticalContext(): Promise<string> {
  return retrieveContext(
    "war conflict sanctions military invasion geopolitical crisis emergency",
    8
  );
}

export async function retrieveRegulatoryContext(): Promise<string> {
  return retrieveContext(
    "crypto regulation ban SEC enforcement legal lawsuit ruling",
    8
  );
}

export async function retrieveMacroContext(): Promise<string> {
  return retrieveContext(
    "interest rates fed inflation recession GDP liquidity quantitative",
    8
  );
}

export async function retrieveCryptoSentiment(): Promise<string> {
  return retrieveContext(
    "bitcoin ethereum crypto market bull bear panic fear uncertainty",
    8
  );
}