import downloadData from "./src/helpers/downloadData.js";

async function main() {
  const data = await downloadData(
    "./data/Global_AI_Content_Impact_Dataset.csv",
  );
  console.log("Data loaded:", data);

  // Utilitaire : Parsing des pourcentages
  const parseNum = (val) => parseFloat(String(val).replace("%", "")) || 0;

  // 1. Préparation et Affichage du Graphique 1 (Bulle : Volume vs Part de Marché)
  const countryStats = d3.rollup(
    data,
    (v) => ({
      volume: d3.sum(v, (d) =>
        parseNum(d["AI-Generated Content Volume (TBs per year)"]),
      ),
      marketShare: d3.mean(v, (d) =>
        parseNum(d["Market Share of AI Companies (%)"]),
      ),
      revenue: d3.mean(v, (d) => parseNum(d["Revenue Increase Due to AI (%)"])),
    }),
    (d) => d.Country,
  );

  const chart1Data = Array.from(countryStats, ([country, values]) => ({
    country,
    ...values,
  }));

  createBubbleChart(
    "graphique1",
    chart1Data,
    "volume",
    "marketShare",
    "revenue",
    "country",
    "Volume (To/an)",
    "Part de Marché (%)",
    "Dominance de l'IA : Volume vs Part de Marché vs Revenus",
  );

  // 2. Préparation et Affichage du Graphique 2 (Quadrant : Productivité vs Adoption)
  const countryAdoptionStats = d3.rollup(
    data,
    (v) => ({
      adoption: d3.mean(v, (d) => parseNum(d["AI Adoption Rate (%)"])),
      volume: d3.sum(v, (d) =>
        parseNum(d["AI-Generated Content Volume (TBs per year)"]),
      ),
    }),
    (d) => d.Country,
  );

  const chart2Data = Array.from(countryAdoptionStats, ([country, values]) => ({
    country,
    ...values,
  }));

  createQuadrantChart(
    "graphique2",
    chart2Data,
    "adoption",
    "volume",
    "country",
    "Taux d'Adoption (%)",
    "Volume de Contenu (To/an)",
    "Matrice de Productivité : Adoption vs Production",
  );

  // 3. Préparation et Affichage du Graphique 3 (Barres Groupées : Performance des Outils)
  const toolStats = d3.rollup(
    data,
    (v) => ({
      revenue: d3.mean(v, (d) => parseNum(d["Revenue Increase Due to AI (%)"])),
      marketShare: d3.mean(v, (d) =>
        parseNum(d["Market Share of AI Companies (%)"]),
      ),
    }),
    (d) => d["Top AI Tools Used"],
  );

  const chart3Data = Array.from(toolStats, ([tool, values]) => ({
    tool,
    ...values,
  })).sort((a, b) => b.revenue - a.revenue); // Sort by Revenue

  createPerformanceBarChart("graphique3", chart3Data);

  // 4. Préparation et Affichage du Graphique 4 (Scatter + Tendance : Chômage vs Adoption)
  const chart4Scatter = data.map((d) => ({
    x: parseNum(d["AI Adoption Rate (%)"]),
    y: parseNum(d["Job Loss Due to AI (%)"]),
    label: d.Country, // or Industry
  }));

  const chart4Trend = processBinnedData(
    data,
    "AI Adoption Rate (%)",
    "Job Loss Due to AI (%)",
    parseNum,
  );

  createTrendScatterChart(
    "graphique4",
    chart4Scatter,
    chart4Trend,
    "Taux d'Adoption (%)",
    "Perte d'Emploi (%)",
    "Analyse : Perte d'Emploi vs Adoption",
  );

  // 5. Préparation et Affichage du Graphique 5 (Scatter + Tendance : Collaboration vs Chômage)
  const chart5Scatter = data.map((d) => ({
    x: parseNum(d["Human-AI Collaboration Rate (%)"]),
    y: parseNum(d["Job Loss Due to AI (%)"]),
    label: d.Industry,
  }));

  const chart5Trend = processBinnedData(
    data,
    "Human-AI Collaboration Rate (%)",
    "Job Loss Due to AI (%)",
    parseNum,
  );

  createTrendScatterChart(
    "graphique5",
    chart5Scatter,
    chart5Trend,
    "Taux de Collaboration (%)",
    "Perte d'Emploi (%)",
    "Analyse : Perte d'Emploi vs Collaboration",
  );

  // 6. Préparation et Affichage du Graphique 6 (Heatmap Bar : Collaboration par Industrie)
  const industryStats = d3.rollup(
    data,
    (v) => ({
      collaboration: d3.mean(v, (d) =>
        parseNum(d["Human-AI Collaboration Rate (%)"]),
      ),
      jobLoss: d3.mean(v, (d) => parseNum(d["Job Loss Due to AI (%)"])),
    }),
    (d) => d.Industry,
  );

  const chart6Data = Array.from(industryStats, ([industry, values]) => ({
    industry,
    ...values,
  })).sort((a, b) => a.collaboration - b.collaboration); // Ascending for horizontal bar (top to bottom)

  createHeatmapBarChart("graphique6", chart6Data);
}

// --- Fonctions Utilitaires pour la Création de Graphiques ---

// Configuration commune du layout Plotly
function getChartLayout(title, xTitle, yTitle) {
  return {
    title: title
      ? {
          text: title,
          font: { size: 18, color: "#e2e8f0" },
          x: 0,
          xanchor: "left",
        }
      : undefined,
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: {
      color: "#cbd5e1", // Slate 300
      family: '"Inter", "Segoe UI", sans-serif',
    },
    margin: { t: 100, b: 80, l: 80, r: 40 },
    xaxis: {
      title: xTitle,
      gridcolor: "#334155", // Slate 700
      zerolinecolor: "#334155",
      automargin: true,
    },
    yaxis: {
      title: yTitle,
      gridcolor: "#334155",
      zerolinecolor: "#334155",
      automargin: true,
    },
    hovermode: "closest",
  };
}

// Traitement des données pour les lignes de tendance (binning)
function processBinnedData(data, xKeyStr, yKeyStr, parseFn) {
  const bins = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  // Create mid-points for plotting on linear x-axis
  const binMids = bins.slice(0, -1).map((b, i) => b + 5);

  // Initialize bins
  const binAccumulators = bins.slice(0, -1).map(() => ({ sum: 0, count: 0 }));

  data.forEach((d) => {
    const xVal = parseFn(d[xKeyStr]);
    const yVal = parseFn(d[yKeyStr]);

    let binIndex = Math.floor(xVal / 10);
    if (binIndex >= 10) binIndex = 9;
    if (binIndex < 0) binIndex = 0;

    binAccumulators[binIndex].sum += yVal;
    binAccumulators[binIndex].count += 1;
  });

  return binMids.map((mid, i) => ({
    x: mid,
    y:
      binAccumulators[i].count > 0
        ? binAccumulators[i].sum / binAccumulators[i].count
        : 0,
  }));
}

// Création du Graphique à Bulles
function createBubbleChart(
  divId,
  data,
  xKey,
  yKey,
  sizeKey,
  labelKey,
  xLabel,
  yLabel,
  title,
) {
  const trace = {
    x: data.map((d) => d[xKey]),
    y: data.map((d) => d[yKey]),
    text: data.map((d) => `${d[labelKey]}<br>Rev: ${d[sizeKey].toFixed(1)}%`),
    mode: "markers",
    marker: {
      size: data.map((d) => d[sizeKey]),
      sizeref: 2, // Scale factor
      sizemode: "area",
      color: data.map((d) => d[xKey]), // Color by X implied volume
      colorscale: "Viridis",
      showscale: true,
      colorbar: { title: "Volume", thickness: 10 },
    },
  };

  const layout = getChartLayout(title, xLabel, yLabel);
  Plotly.newPlot(divId, [trace], layout, { responsive: true });
}

// Création du Graphique en Quadrants
function createQuadrantChart(
  divId,
  data,
  xKey,
  yKey,
  labelKey,
  xLabel,
  yLabel,
  title,
) {
  const xAvg = d3.mean(data, (d) => d[xKey]);
  const yAvg = d3.mean(data, (d) => d[yKey]);

  const trace = {
    x: data.map((d) => d[xKey]),
    y: data.map((d) => d[yKey]),
    text: data.map((d) => d[labelKey]),
    mode: "markers",
    type: "scatter",
    marker: {
      color: "#38bdf8",
      size: 10,
      line: { color: "#fff", width: 1 },
    },
  };

  const layout = getChartLayout(title, xLabel, yLabel);

  // Add Quadrant Lines
  layout.shapes = [
    {
      type: "line",
      x0: xAvg,
      x1: xAvg,
      y0: 0,
      y1: 1,
      xref: "x",
      yref: "paper",
      line: { color: "#94a3b8", width: 1, dash: "dash" },
    },
    {
      type: "line",
      x0: 0,
      x1: 1,
      y0: yAvg,
      y1: yAvg,
      xref: "paper",
      yref: "y",
      line: { color: "#94a3b8", width: 1, dash: "dash" },
    },
  ];

  Plotly.newPlot(divId, [trace], layout, { responsive: true });
}

// Création du Graphique à Barres Groupées
function createPerformanceBarChart(divId, data) {
  const trace1 = {
    x: data.map((d) => d.tool),
    y: data.map((d) => d.revenue),
    name: "Hausse Revenus (%)",
    type: "bar",
    marker: { color: "#10b981" }, // Emerald
  };

  const trace2 = {
    x: data.map((d) => d.tool),
    y: data.map((d) => d.marketShare),
    name: "Part de Marché (%)",
    type: "bar",
    marker: { color: "#6366f1" }, // Indigo
  };

  const layout = getChartLayout(
    "Top Outils : Impact Revenus vs Popularité",
    "Outil",
    "Pourcentage",
  );
  layout.barmode = "group";
  layout.legend = { orientation: "h", y: 1.1 };

  Plotly.newPlot(divId, [trace1, trace2], layout, { responsive: true });
}

// Création du Graphique Scatter avec Tendance
function createTrendScatterChart(
  divId,
  scatterData,
  trendData,
  xLabel,
  yLabel,
  title,
) {
  const traceScatter = {
    x: scatterData.map((d) => d.x),
    y: scatterData.map((d) => d.y),
    text: scatterData.map((d) => d.label),
    mode: "markers",
    type: "scatter",
    name: "Points de Données",
    marker: { color: "#475569", size: 6, opacity: 0.4 }, // Subtle scatter
  };

  const traceTrend = {
    x: trendData.map((d) => d.x),
    y: trendData.map((d) => d.y),
    mode: "lines",
    type: "scatter",
    name: "Tendance Moyenne",
    line: { color: "#ef4444", width: 4, shape: "spline" }, // Red trend
  };

  const layout = getChartLayout(title, xLabel, yLabel);
  layout.showlegend = true;
  layout.legend = { orientation: "h", y: 1.1 };

  Plotly.newPlot(divId, [traceScatter, traceTrend], layout, {
    responsive: true,
  });
}

// Création du Graphique Heatmap Bar
function createHeatmapBarChart(divId, data) {
  const trace = {
    x: data.map((d) => d.collaboration),
    y: data.map((d) => d.industry),
    type: "bar",
    orientation: "h",
    marker: {
      color: data.map((d) => d.jobLoss), // Color by Job Loss Risk
      colorscale: "RdYlGn", // Red-Yellow-Green
      reversescale: true, // Red = High Loss (Bad), Green = Low Loss (Good)
      showscale: true,
      colorbar: { title: "Perte d'Emploi %", thickness: 15 },
    },
    text: data.map((d) => `Perte : ${d.jobLoss.toFixed(1)}%`),
    textposition: "auto",
  };

  const layout = getChartLayout(
    "Résilience par Industrie : Zones de Sécurité Collaboratives",
    "Taux de Collaboration (%)",
    "",
  );
  layout.margin.l = 150; // More space for industry names
  layout.height = 500;

  Plotly.newPlot(divId, [trace], layout, { responsive: true });
}

main();
