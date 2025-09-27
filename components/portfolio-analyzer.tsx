"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Trash2, TrendingUp, TrendingDown, Minus } from "lucide-react"
import type { PortfolioAnalysis, UsageStats } from "@/lib/types"

interface StockInput {
  symbol: string
  shares: number
}

export function PortfolioAnalyzer() {
  const [stocks, setStocks] = useState<StockInput[]>([{ symbol: "", shares: 0 }])
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null)
  const [usage, setUsage] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addStock = () => {
    setStocks([...stocks, { symbol: "", shares: 0 }])
  }

  const removeStock = (index: number) => {
    setStocks(stocks.filter((_, i) => i !== index))
  }

  const updateStock = (index: number, field: keyof StockInput, value: string | number) => {
    const updated = [...stocks]
    updated[index] = { ...updated[index], [field]: value }
    setStocks(updated)
  }

  const analyzePortfolio = async () => {
    const validStocks = stocks.filter((s) => s.symbol && s.shares > 0)
    if (validStocks.length === 0) {
      setError("Please add at least one stock with shares")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Track usage
      await fetch("/api/usage/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "portfolio_analysis",
          metadata: { stockCount: validStocks.length },
        }),
      })

      // Analyze portfolio
      const response = await fetch("/api/portfolio/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stocks: validStocks }),
      })

      if (!response.ok) {
        throw new Error("Failed to analyze portfolio")
      }

      const result = await response.json()
      setAnalysis(result)

      // Get updated usage stats
      const usageResponse = await fetch("/api/usage/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "get_usage" }),
      })

      if (usageResponse.ok) {
        const usageData = await usageResponse.json()
        setUsage(usageData.usage)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "BUY":
        return "bg-green-500/10 text-green-600 border-green-500/20"
      case "SELL":
        return "bg-red-500/10 text-red-600 border-red-500/20"
      case "HOLD":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20"
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20"
    }
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case "HIGH":
        return "bg-green-500/10 text-green-600"
      case "MEDIUM":
        return "bg-yellow-500/10 text-yellow-600"
      case "LOW":
        return "bg-red-500/10 text-red-600"
      default:
        return "bg-gray-500/10 text-gray-600"
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold text-white">Try StockSage Live</h2>
        <p className="text-gray-400">Enter your portfolio and get AI-powered investment advice</p>
        {usage && (
          <div className="flex justify-center gap-4 text-sm text-gray-500">
            <span>Portfolios Analyzed: {usage.portfoliosAnalyzed}</span>
            <span>Advice Generated: {usage.adviceGenerated}</span>
          </div>
        )}
      </div>

      <Card className="bg-gray-900/50 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Your Portfolio</CardTitle>
          <CardDescription>Add your stocks and shares to get started</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {stocks.map((stock, index) => (
            <div key={index} className="flex gap-3 items-center">
              <Input
                placeholder="Stock Symbol (e.g., AAPL)"
                value={stock.symbol}
                onChange={(e) => updateStock(index, "symbol", e.target.value.toUpperCase())}
                className="bg-gray-800 border-gray-700 text-white flex-1"
              />
              <Input
                type="number"
                placeholder="Shares"
                value={stock.shares || ""}
                onChange={(e) => updateStock(index, "shares", Number.parseInt(e.target.value) || 0)}
                className="bg-gray-800 border-gray-700 text-white w-32"
              />
              {stocks.length > 1 && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => removeStock(index)}
                  className="border-gray-700 text-gray-400 hover:text-red-400"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={addStock}
              className="border-gray-700 text-gray-400 hover:text-white bg-transparent"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Stock
            </Button>
            <Button
              onClick={analyzePortfolio}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Analyze Portfolio"
              )}
            </Button>
          </div>

          {error && (
            <div className="text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</div>
          )}
        </CardContent>
      </Card>

      {analysis && (
        <div className="space-y-6">
          {/* Portfolio Overview */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                Portfolio Overview
                <Badge
                  className={`${analysis.portfolio.totalGainLoss >= 0 ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}`}
                >
                  {analysis.portfolio.totalGainLoss >= 0 ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {analysis.portfolio.totalGainLossPercent >= 0 ? "+" : ""}
                  {analysis.portfolio.totalGainLossPercent.toFixed(2)}%
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-xs ${analysis.dataSource === "live" ? "border-green-500/50 text-green-400" : "border-yellow-500/50 text-yellow-400"}`}
                >
                  {analysis.dataSource === "live" ? "🟢 Live Data" : "🟡 Demo Data"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Total Value</p>
                  <p className="text-white text-xl font-semibold">${analysis.portfolio.totalValue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Gain/Loss</p>
                  <p
                    className={`text-xl font-semibold ${analysis.portfolio.totalGainLoss >= 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    {analysis.portfolio.totalGainLoss >= 0 ? "+" : ""}$
                    {analysis.portfolio.totalGainLoss.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Diversification</p>
                  <p className="text-white text-xl font-semibold">{analysis.diversificationScore}/100</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Risk Level</p>
                  <Badge
                    className={`${
                      analysis.riskLevel === "LOW"
                        ? "bg-green-500/10 text-green-600"
                        : analysis.riskLevel === "MEDIUM"
                          ? "bg-yellow-500/10 text-yellow-600"
                          : "bg-red-500/10 text-red-600"
                    }`}
                  >
                    {analysis.riskLevel}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Overall Advice */}
          <Card className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border-green-500/20">
            <CardHeader>
              <CardTitle className="text-white">🤖 AI Investment Advice</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300 leading-relaxed">{analysis.overallAdvice}</p>
            </CardContent>
          </Card>

          {/* Individual Stock Recommendations */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white">Individual Stock Analysis</h3>
            <div className="grid gap-4">
              {analysis.individualAdvice.map((advice, index) => (
                <Card key={advice.symbol} className="bg-gray-900/50 border-gray-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h4 className="text-white font-semibold">{advice.symbol}</h4>
                        <Badge className={getActionColor(advice.action)}>{advice.action}</Badge>
                        <Badge className={getConfidenceColor(advice.confidence)}>{advice.confidence}</Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 text-sm">Current Price</p>
                        <p className="text-white font-semibold">
                          ${analysis.portfolio.stocks.find((s) => s.symbol === advice.symbol)?.currentPrice.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <p className="text-gray-300 text-sm">{advice.reasoning}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Key Insights */}
          {analysis.keyInsights.length > 0 && (
            <Card className="bg-blue-500/10 border-blue-500/20">
              <CardHeader>
                <CardTitle className="text-white">💡 Key Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.keyInsights.map((insight, index) => (
                    <li key={index} className="text-gray-300 flex items-start gap-2">
                      <Minus className="h-4 w-4 mt-0.5 text-blue-400 flex-shrink-0" />
                      {insight}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
