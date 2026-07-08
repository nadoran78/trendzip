import Link from "next/link";
import { notFound } from "next/navigation";

type FeedPageProps = {
  params: Promise<{
    generation: string;
  }>;
};

const generationLabels: Record<string, string> = {
  teen: "10대",
  twenty: "20대",
};

export default async function FeedPage({ params }: FeedPageProps) {
  const { generation } = await params;
  const label = generationLabels[generation];

  if (!label) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-6 py-8 text-zinc-50">
      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[430px] flex-col justify-between">
        <div className="space-y-4">
          <Link href="/" className="text-sm font-medium text-zinc-400">
            MZ 따라잡기
          </Link>
          <h1 className="text-4xl font-semibold">{label} 피드</h1>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 text-zinc-300">
          <p className="text-base leading-7">피드를 준비하고 있습니다.</p>
        </div>
      </section>
    </main>
  );
}
