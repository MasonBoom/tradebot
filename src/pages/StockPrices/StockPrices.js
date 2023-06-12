import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Chart, registerables } from 'chart.js';
import * as tf from '@tensorflow/tfjs';
import { SMA, RSI, MACD, BollingerBands } from 'technicalindicators';
import { createModel, preprocessData, makePredictions, trainModel } from '../../models/predictionModel';

tf.setBackend('cpu');

const apiKey = process.env.API_KEY;
const symbol = 'SPY';

function StockPrices() {
  const [prices, setPrices] = useState([]);
  const [chartInitialized, setChartInitialized] = useState(false);
  const chartRef = useRef(null);

  useEffect(() => {
    axios
      .get(`https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&outputsize=full&apikey=${apiKey}`)
      .then((response) => {
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
            price: closePrice,
          });
          closePrices.push(closePrice);
          volume.push(volumeValue);
        }

        const movingAveragePeriod = 20;
        const rsiPeriod = 14;
        const macdPeriod = 12;
        const signalPeriod = 9;
        const bollingerBandsPeriod = 20;
        const standardDeviations = 2;

        const sma = SMA.calculate({ period: movingAveragePeriod, values: closePrices });
        const rsi = RSI.calculate({ period: rsiPeriod, values: closePrices });
        const macd = MACD.calculate({ fastPeriod: macdPeriod, slowPeriod: 26, signalPeriod, values: closePrices });
        const bollingerBands = BollingerBands.calculate({
          period: bollingerBandsPeriod,
          stdDev: standardDeviations,
          values: closePrices,
        });

        const pricesWithIndicators = prices.map((price, index) => ({
          ...price,
          sma: sma[index],
          rsi: rsi[index],
          macd: macd[index],
          bollingerBands: bollingerBands[index],
        }));

        // Preprocess the data for input into the prediction model
        const processedData = preprocessData(pricesWithIndicators);
        setPrices(processedData);
      })
      .catch((error) => {
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
          labels: prices.map((price) => price.date),
          datasets: [
            {
              label: 'Closing Price',
              data: prices.map((price) => price.price),
              borderColor: 'blue',
              fill: false,
            },
          ],
        },
        plugins: {
          // options for plugins, such as tooltips and legends
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
        },
      });
      setChartInitialized(true);
    }
  }, [prices, chartInitialized]);

  const makePredictions = async (model) => {
    // Prepare the input data for prediction
    const inputTensor = tf.tensor2d(prices.map((price) => price.inputFeatures));
    const reshapedInput = inputTensor.reshape([inputTensor.shape[0], 1, inputTensor.shape[1]]);

    // Perform predictions
    const predictions = model.predict(reshapedInput).dataSync();

    // Dispose of the tensors to free up memory
    inputTensor.dispose();
    reshapedInput.dispose();
    model.dispose();

    // Perform any further processing or rendering based on the predictions
    console.log('Predictions:', predictions);
  };

  const preprocessOutputLabels = (data) => {
    const outputLabels = data.map((price, index) => {
      if (index < data.length - 1) {
        return [data[index + 1].price];
      } else {
        return [null];
      }
    });
    return outputLabels;
  };

  const preprocessInputFeatures = (data) => {
    const inputFeatures = data.map((price) => [
      price.sma,
      price.rsi,
      price.macd.histogram,
      price.bollingerBands.lower,
      price.bollingerBands.upper,
    ]);
    return inputFeatures;
  };

  useEffect(() => {
    const train = async () => {
      const inputFeatures = preprocessInputFeatures(prices);
      const outputLabels = preprocessOutputLabels(prices);

      // Convert the preprocessed data to tensors
      const XTrain = tf.tensor2d(inputFeatures, [inputFeatures.length, inputFeatures[0].length]);
      const yTrain = tf.tensor2d(outputLabels);

      // Create the model
      const model = createModel(XTrain.shape[1]);

      // Define training parameters
      const epochs = 50; // Set the number of training epochs
      const batchSize = 32; // Set the batch size

      // Train the model
      await trainModel(model, XTrain, yTrain, epochs, batchSize);

      // Dispose of the tensors to free up memory
      XTrain.dispose();
      yTrain.dispose();

      // Make predictions with the trained model
      makePredictions(model);
    };

    if (prices.length > 0) {
      train();
    }
  }, [prices]);

  return (
    <div className="main">
      <h1>Historical Stock Prices for {symbol}</h1>
      <div>
        <canvas id="chart" ref={chartRef} style={{ height: '600px', width: '100%' }} />
      </div>
      <button onClick={() => makePredictions()}>Make Prediction</button>
    </div>
  );
}

export default StockPrices;
