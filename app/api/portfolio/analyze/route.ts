import { generateText } from "ai"
import { calculatePortfolioMetrics, generateRuleBasedAdvice } from "@/lib/portfolio-analyzer"
import { flexprice } from "@/lib/integrations/flexprice"
import { pathway } from "@/lib/integrations/pathway"
import type { PortfolioAnalysis } from "@/lib/types"

function generateFallbackAdvice(portfolio: any, ruleBasedAnalysis: any): string {
  const { totalValue, totalGainLoss, totalGainLossPercent } = portfolio
  const { diversificationScore, riskLevel, keyInsights } = ruleBasedAnalysis

  let advice = ""

  // Generate advice based on portfolio performance
  if (totalGainLossPercent > 5) {
    advice = "Your portfolio is performing well with strong gains. "
  } else if (totalGainLossPercent < -5) {
    advice = "Your portfolio is experiencing some losses, but this is normal market behavior. "
  } else {
    advice = "Your portfolio is showing stable performance. "
  }

  // Add diversification guidance
  if (diversificationScore < 40) {
    advice += "Consider diversifying across more sectors to reduce risk. "
  } else if (diversificationScore > 80) {
    advice += "Your portfolio shows excellent diversification. "
  }

  // Add risk-based recommendations
  if (riskLevel === "HIGH") {
    advice += "Your current allocation carries higher risk - consider rebalancing for stability."
  } else if (riskLevel === "LOW") {
    advice += "Your conservative approach provides good stability for long-term growth."
  } else {
    advice += "Your balanced approach aligns well with moderate risk tolerance."
  }

  return advice
}

export async function POST(req: Request) {
  try {
    const { stocks } = await req.json()

    if (!stocks || !Array.isArray(stocks) || stocks.length === 0) {
      return Response.json({ error: "Invalid portfolio data" }, { status: 400 })
    }

    await flexprice.trackUsage({
      eventType: "portfolio_analysis",
      metadata: {
        stockCount: stocks.length,
        symbols: stocks.map((s) => s.symbol),
      },
    })

    const symbols = stocks.map((stock) => stock.symbol)
    const pathwayResult = await pathway.getStockData(symbols)

    // Update stock data with real prices if available
    let updatedStocks = stocks
    if (pathwayResult.success && pathwayResult.data) {
      updatedStocks = stocks.map((stock) => {
        const realTimeData = pathwayResult.data.find((d) => d.symbol === stock.symbol)
        if (realTimeData) {
          return {
            ...stock,
            currentPrice: realTimeData.price,
            change: realTimeData.change,
            changePercent: realTimeData.change_percent,
          }
        }
        return stock
      })
    }

    // Calculate portfolio metrics using updated data
    const portfolio = calculatePortfolioMetrics(updatedStocks)
    const ruleBasedAnalysis = generateRuleBasedAdvice(portfolio)

    let overallAdvice: string

    try {
      await flexprice.trackUsage({
        eventType: "advice_generation",
        metadata: {
          portfolioValue: portfolio.totalValue,
          riskLevel: ruleBasedAnalysis.riskLevel,
        },
      })

      const portfolioSummary = portfolio.stocks
        .map((stock) => `${stock.symbol}: ${stock.shares} shares at $${stock.currentPrice} (${stock.sector})`)
        .join(", ")

      const prompt = `As a financial advisor, provide overall investment advice for this portfolio:

Portfolio: ${portfolioSummary}
Total Value: $${portfolio.totalValue.toLocaleString()}
Total Gain/Loss: ${portfolio.totalGainLoss >= 0 ? "+" : ""}$${portfolio.totalGainLoss.toLocaleString()} (${portfolio.totalGainLossPercent.toFixed(2)}%)
Diversification Score: ${ruleBasedAnalysis.diversificationScore}/100
Risk Level: ${ruleBasedAnalysis.riskLevel}

Key Insights: ${ruleBasedAnalysis.keyInsights?.join(" ") || "None"}

Provide a concise, beginner-friendly overall assessment and recommendation in 2-3 sentences. Focus on the big picture strategy rather than individual stocks.`

      const { text } = await generateText({
        model: "openai/gpt-4o-mini",
        prompt,
        maxOutputTokens: 200,
        temperature: 0.7,
      })

      overallAdvice = text
    } catch (aiError) {
      console.log("[v0] AI Gateway unavailable, using fallback advice generation")
      overallAdvice = generateFallbackAdvice(portfolio, ruleBasedAnalysis)
    }

    const analysis: PortfolioAnalysis = {
      portfolio,
      individualAdvice: ruleBasedAnalysis.individualAdvice || [],
      overallAdvice,
      diversificationScore: ruleBasedAnalysis.diversificationScore || 0,
      riskLevel: ruleBasedAnalysis.riskLevel || "MEDIUM",
      keyInsights: ruleBasedAnalysis.keyInsights || [],
      dataSource: pathwayResult.mock ? "mock" : "live",
    }

    return Response.json(analysis)
  } catch (error) {
    console.error("Portfolio analysis error:", error)
    return Response.json({ error: "Failed to analyze portfolio" }, { status: 500 })
  }
}
