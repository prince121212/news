import { Link, createFileRoute } from "@tanstack/react-router"
import { chinaDateKey } from "@shared/site"
import { seoTitle, usePageSEO } from "~/utils/seo"

export const Route = createFileRoute("/daily")({
  component: DailyIndexComponent,
})

function dateKey(offset: number) {
  const date = new Date()
  date.setDate(date.getDate() - offset)
  return chinaDateKey(date)
}

function DailyIndexComponent() {
  usePageSEO({
    title: seoTitle("每日简报归档"),
    description: "择流每日简报归档，持续整理 AI、科技、财经与热点资讯。",
    path: "/daily",
  })

  const days = Array.from({ length: 21 }, (_, index) => dateKey(index))

  return (
    <main className="seo-page aihot-app">
      <section className="seo-hero">
        <Link to="/" className="seo-back">← 返回首页</Link>
        <p className="seo-kicker">Daily Briefing</p>
        <h1>每日简报归档</h1>
        <p>每天沉淀一份可检索、可订阅、可引用的资讯简报。当前优先建设 AI 日报。</p>
      </section>
      <section className="seo-card">
        <h2>AI 日报</h2>
        <div className="seo-archive-grid">
          {days.map(day => (
            <Link key={day} to="/daily/$date" params={{ date: `${day}-ai` }}>
              {day}
              {" "}
              AI 日报
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
