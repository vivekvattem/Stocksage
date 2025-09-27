import { getAllAvailableStocks, getStockData } from "@/lib/mock-data"
import { pathway } from "@/lib/integrations/pathway"
import { flexprice } from "@/lib/integrations/flexprice"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("q")?.toUpperCase() || ""

  try {
    await flexprice.trackUsage({
      eventType: "stock_search",
      metadata: { query },
    })

    if (query) {
      const pathwayResult = await pathway.searchStocks(query)
      if (pathwayResult.success) {
        return Response.json(
          pathwayResult.data.map((stock) => ({
            symbol: stock.symbol,
            name: stock.name,
            exchange: stock.exchange,
            dataSource: pathwayResult.mock ? "mock" : "live",
          })),
        )
      }
    }

    // Fallback to existing mock data logic
    const availableStocks = getAllAvailableStocks()

    if (!query) {
      // Return all available stocks
      const stocks = availableStocks.map((symbol) => {
        const data = getStockData(symbol)
        return {
          symbol,
          name: getCompanyName(symbol),
          sector: data?.sector,
          currentPrice: data?.currentPrice,
          dataSource: "mock",
        }
      })
      return Response.json(stocks)
    }

    // Filter stocks by query
    const filteredStocks = availableStocks
      .filter((symbol) => symbol.includes(query) || getCompanyName(symbol).toUpperCase().includes(query))
      .map((symbol) => {
        const data = getStockData(symbol)
        return {
          symbol,
          name: getCompanyName(symbol),
          sector: data?.sector,
          currentPrice: data?.currentPrice,
          dataSource: "mock",
        }
      })

    return Response.json(filteredStocks)
  } catch (error) {
    console.error("Stock search error:", error)
    return Response.json({ error: "Failed to search stocks" }, { status: 500 })
  }
}

function getCompanyName(symbol: string): string {
  const names: Record<string, string> = {
    AAPL: "Apple Inc.",
    TSLA: "Tesla Inc.",
    NVDA: "NVIDIA Corporation",
    MSFT: "Microsoft Corporation",
    GOOGL: "Alphabet Inc.",
    AMZN: "Amazon.com Inc.",
    META: "Meta Platforms Inc.",
    NFLX: "Netflix Inc.",
  }
  return names[symbol] || symbol
}
