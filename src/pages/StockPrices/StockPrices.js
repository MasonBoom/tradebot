import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Chart, registerables } from 'chart.js';
import { SMA, RSI, MACD, BollingerBands } from 'technicalindicators';

const apiKey = process.env.API_KEY; 
const symbol = 'SPY'; // symbol for S&P 500 Inc.

function StockPrices() {
  const [prices, setPrices] = useState([]);
  const [chartInitialized, setChartInitialized] = useState(false);
  const chartRef = useRef(null);

  useEffect(() => {
    // fetch daily adjusted stock prices for SPY for the past year
    axios.get(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&outputsize=full&apikey=${apiKey}`)
      .then(response => {
        // extract the data from the response object
        const data = response.data['Time Series (Daily)'];
  
        // convert data to an array of objects
        const prices = [];
        const closePrices = [];
        const volume = [];
        for (const date in data) {
          const closePrice = parseFloat(data[date]['4. close']);
          const volumeValue = parseFloat(data[date]['6. volume']);
          prices.push({
            date: date,
            price: closePrice
          });
          closePrices.push(closePrice);
          volume.push(volumeValue);
        }
  
        const movingAveragePeriod = 20; // Define the period for the moving average
        const rsiPeriod = 14; // Define the period for RSI calculation
        const macdPeriod = 12; // Define the period for MACD calculation
        const signalPeriod = 9; // Define the period for MACD signal calculation
        const bollingerBandsPeriod = 20; // Define the period for Bollinger Bands calculation
        const standardDeviations = 2; // Define the standard deviations for Bollinger Bands
  
        const sma = SMA.calculate({ period: movingAveragePeriod, values: closePrices });
        const rsi = RSI.calculate({ period: rsiPeriod, values: closePrices });
        const macd = MACD.calculate({ fastPeriod: macdPeriod, slowPeriod: 26, signalPeriod, values: closePrices });
        const bollingerBands = BollingerBands.calculate({
          period: bollingerBandsPeriod,
          stdDev: standardDeviations,
          values: closePrices
        });
  
        const pricesWithIndicators = prices.map((price, index) => ({
          ...price,
          sma: sma[index],
          rsi: rsi[index],
          macd: macd[index],
          bollingerBands: bollingerBands[index]
        }));
  
        setPrices(pricesWithIndicators.reverse());
      })
      .catch(error => {
        console.error(error);
      });
  }, []);

  useEffect(() => {
    // create a line chart using Chart.js
    Chart.register(...registerables);
    const ctx = chartRef.current.getContext('2d');
    if (!chartInitialized && prices.length > 0) {
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: prices.map(price => price.date), 
          datasets: [{
            label: 'Closing Price',
            data: prices.map(price => price.price), 
            borderColor: 'blue',
            fill: false
          }]
        },
        plugins: {
          // options for plugins, such as tooltips and legends
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
      setChartInitialized(true);
    }
  }, [prices, chartInitialized]);

  // Make a basic prediction on whether the price will go up or down
  const makePrediction = () => {
    if (prices.length < 2) {
      return 'Insufficient data';
    }

    const currentPrice = prices[prices.length - 1].price;
    const previousPrice = prices[prices.length - 2].price;

    if (currentPrice > previousPrice) {
      return 'Price will go up';
    } else {
      return 'Price will go down';
    }
  };

  return (
    <div className="main">
      <h1>Historical Stock Prices for {symbol}</h1>
      <div>
        <canvas id="chart" ref={chartRef} style={{ height: '600px', width: '100%' }} />
      </div>
      <button onClick={makePrediction}>Make Prediction</button>
    </div>
  );
}

export default StockPrices;
