import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { Suspense } from "react"
import {
  Bebas_Neue as V0_Font_Bebas_Neue,
  Space_Mono as V0_Font_Space_Mono,
  Roboto as V0_Font_Roboto,
} from "next/font/google"

// Initialize fonts
const bebasNeue = V0_Font_Bebas_Neue({ weight: ["400"] })
const spaceMono = V0_Font_Space_Mono({ weight: ["400", "700"] })
const roboto = V0_Font_Roboto({ weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"] })

export const metadata: Metadata = {
  title: "StockSage - Smart Stock Consultant Agent",
  description: "Where Wisdom Meets Investing. Get AI-powered stock advice in plain English, perfect for beginners.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${bebasNeue.variable} ${spaceMono.variable} ${roboto.variable}`}>
        <Suspense>{children}</Suspense>
      </body>
    </html>
  )
}
