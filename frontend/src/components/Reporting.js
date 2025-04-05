// frontend/src/components/Reporting.js
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement, // Required for Pie charts
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
// Using standard buttons here, but you can import Button from react-bootstrap if integrated
// import Button from 'react-bootstrap/Button';

// Register Chart.js components (Make sure all needed elements are registered)
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement, // Register ArcElement
  Title,
  Tooltip,
  Legend
);

// Determine API Base URL (use relative if served from same origin)
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

// Helper function for generating distinct colors for Pie chart slices
const generateColors = (numColors) => {
  const colors = [ // Add more colors if needed
    'rgba(255, 99, 132, 0.7)', 'rgba(54, 162, 235, 0.7)', 'rgba(255, 206, 86, 0.7)',
    'rgba(75, 192, 192, 0.7)', 'rgba(153, 102, 255, 0.7)', 'rgba(255, 159, 64, 0.7)',
    'rgba(99, 255, 132, 0.7)', 'rgba(235, 54, 162, 0.7)', 'rgba(86, 255, 206, 0.7)',
    'rgba(192, 75, 192, 0.7)', 'rgba(255, 102, 153, 0.7)', 'rgba(64, 255, 159, 0.7)',
    'rgba(201, 203, 207, 0.7)' // A grey color
  ];
  // Repeat colors if more data points than predefined colors
  return Array.from({ length: numColors }, (_, i) => colors[i % colors.length]);
};


function Reporting({ setError }) {
  // State for different report data and loading status
  const [vendorReportData, setVendorReportData] = useState(null);
  const [tagReportData, setTagReportData] = useState(null);
  const [isLoadingVendor, setIsLoadingVendor] = useState(true);
  const [isLoadingTag, setIsLoadingTag] = useState(true);

  // Refs for charts (optional, can be used to access chart instances)
  const barChartRef = useRef(null);
  const pieChartRef = useRef(null);

  // Fetch Vendor Spending Report Data
  useEffect(() => {
    const fetchVendorReport = async () => {
      setIsLoadingVendor(true);
      // Don't clear global error here, let fetchTagReport do it or handle globally
      try {
        const response = await axios.get(`${API_BASE_URL}/reports/spending-by-vendor`);
        setVendorReportData(response.data); // Expects { labels, data, csvData, summary }
      } catch (err) {
        console.error("Fetch vendor report error:", err);
        setError(err.response?.data?.message || err.message || "Failed to fetch vendor spending report.");
        setVendorReportData(null);
      } finally {
        setIsLoadingVendor(false);
      }
    };
    fetchVendorReport();
  }, [setError]); // Dependency array includes setError

  // Fetch Tag Spending Report Data
  useEffect(() => {
    const fetchTagReport = async () => {
      setIsLoadingTag(true);
      setError(''); // Clear errors before fetching this report
      try {
        const response = await axios.get(`${API_BASE_URL}/reports/spending-by-tag`);
        setTagReportData(response.data); // Expects { labels, data, colors, csvData }
      } catch (err) {
        console.error("Fetch tag report error:", err);
        setError(err.response?.data?.message || err.message || "Failed to fetch tag spending report.");
        setTagReportData(null);
      } finally {
        setIsLoadingTag(false);
      }
    };
    fetchTagReport();
  }, [setError]); // Dependency array includes setError

  // --- Helper to format currency ---
  const formatCurrency = (value) => {
    // Ensure value is a number, default to 0 if not
    const numberValue = typeof value === 'number' ? value : 0;
    return numberValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  }

  // --- Shared Tooltip Callback ---
  const tooltipLabelCallback = (context) => {
    let label = context.label || ''; // Pie chart uses label directly
    if (label) { label += ': '; }
    // Use context.parsed for Pie, context.parsed.y for Bar
    let value = context.parsed?.y ?? context.parsed;
    if (value !== null && typeof value === 'number') {
      label += formatCurrency(value);
    }
    return label;
  };

  // --- Bar Chart Config (Vendors) ---
  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Total Spending by Vendor' },
      tooltip: { callbacks: { label: tooltipLabelCallback } }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact' }).format(value)
        }
      }
    }
  };

  const barChartData = {
    labels: vendorReportData?.labels || [],
    datasets: [{
      label: 'Total Spent ($)',
      data: vendorReportData?.data || [],
      backgroundColor: 'rgba(54, 162, 235, 0.6)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1,
    }],
  };

  // --- Pie Chart Config (Tags) ---
  const tagPieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Spending Distribution by Tag' },
      tooltip: { callbacks: { label: tooltipLabelCallback } }
    }
  };

  const tagPieChartData = {
    labels: tagReportData?.labels || [],
    datasets: [{
      label: 'Total Spent ($)',
      data: tagReportData?.data || [],
      backgroundColor: tagReportData?.colors || generateColors(tagReportData?.data?.length || 0), // Use colors from API or generate
      borderColor: '#ffffff', // White border between slices
      borderWidth: 1,
    }],
  };

  // --- CSV Download Handlers ---
  const createCsvDownloader = (reportDataObj, filename) => {
    return () => {
      if (!reportDataObj || !reportDataObj.csvData || reportDataObj.csvData.length === 0) {
        alert(`No data available to download for ${filename}.`);
        return;
      }
      // Determine headers based on keys of the first csvData object
      const headers = Object.keys(reportDataObj.csvData[0]);
      const headerRow = headers.join(',');

      // Create rows, ensuring proper CSV escaping for values
      const rows = reportDataObj.csvData.map(row => {
        return headers.map(header => {
          const value = row[header] === null || row[header] === undefined ? '' : String(row[header]);
          // Escape quotes and wrap in quotes if value contains comma, quote, or newline
          const escapedValue = value.replace(/"/g, '""');
          return (value.includes(',') || value.includes('"') || value.includes('\n')) ? `"${escapedValue}"` : escapedValue;
        }).join(',');
      });

      const csvContent = [headerRow, ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");

      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        alert("CSV download is not supported in your browser.");
      }
    };
  };

  const handleDownloadVendorCsv = createCsvDownloader(vendorReportData, 'vendor_spending_report.csv');
  const handleDownloadTagCsv = createCsvDownloader(tagReportData, 'tag_spending_report.csv');

  // --- Combined Loading State ---
  const isLoading = isLoadingVendor || isLoadingTag;

  // --- Extract Summary Data ---
  // Assuming summary comes from the vendor report endpoint
  const summary = vendorReportData?.summary;

  return (
    <div>
      <h2>Reports</h2>

      {isLoading ? (
        <p className="loading-message">Loading report data...</p>
      ) : (!vendorReportData && !tagReportData) ? ( // Check if both failed or returned null
        <p>Could not load report data.</p> // Display if both fetches failed
      ) : (
        <div className="report-container">

          {/* --- Display Summary Statistics --- */}
          <div className="report-summary" style={{ marginBottom: '30px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '5px', border: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: '15px' }}>
            {summary ? (
              <>
                <div style={{ textAlign: 'center', margin: '10px' }}>
                  <h4 style={{ marginBottom: '5px', color: '#495057', fontSize: '1rem' }}>Total Contracted</h4>
                  <p style={{ fontSize: '1.4em', fontWeight: 'bold', color: '#0d6efd', margin: 0 }}>{formatCurrency(summary.totalContracted)}</p>
                </div>
                <div style={{ textAlign: 'center', margin: '10px' }}>
                  <h4 style={{ marginBottom: '5px', color: '#495057', fontSize: '1rem' }}>Total Spent</h4>
                  <p style={{ fontSize: '1.4em', fontWeight: 'bold', color: '#198754', margin: 0 }}>{formatCurrency(summary.totalSpent)}</p>
                </div>
                <div style={{ textAlign: 'center', margin: '10px' }}>
                  <h4 style={{ marginBottom: '5px', color: '#495057', fontSize: '1rem' }}>Remaining Liability</h4>
                  <p style={{ fontSize: '1.4em', fontWeight: 'bold', color: '#dc3545', margin: 0 }}>{formatCurrency(summary.totalContracted - summary.totalSpent)}</p>
                </div>
              </>
            ) : (
              // Show placeholder if vendor report loaded but summary was missing
              !isLoadingVendor && <p>Summary data not available.</p>
            )}
          </div>
          {/* --- End Summary Statistics --- */}


          {/* --- Charts --- */}
          <div className="charts-wrapper" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '30px' }}>
            {/* Vendor Bar Chart */}
            <div className="chart-container" style={{ flex: '1 1 400px', minWidth: '300px', height: '400px', position: 'relative', padding: '10px', border: '1px solid #eee', borderRadius: '4px' }}>
              <h4 style={{ textAlign: 'center', marginBottom: '15px' }}>Spending by Vendor</h4>
              {(vendorReportData?.labels?.length > 0) ? (
                <Bar ref={barChartRef} options={barChartOptions} data={barChartData} />
              ) : !isLoadingVendor ? ( // Show only if not loading
                <p className="text-muted text-center mt-5">No vendor spending data.</p>
              ) : null}
            </div>

            {/* Tag Pie Chart */}
            <div className="chart-container" style={{ flex: '1 1 350px', minWidth: '250px', height: '400px', position: 'relative', padding: '10px', border: '1px solid #eee', borderRadius: '4px' }}>
              <h4 style={{ textAlign: 'center', marginBottom: '15px' }}>Spending by Tag</h4>
              {(tagReportData?.labels?.length > 0) ? (
                <Pie ref={pieChartRef} options={tagPieChartOptions} data={tagPieChartData} />
              ) : !isLoadingTag ? ( // Show only if not loading
                <p className="text-muted text-center mt-5">No tag spending data.</p>
              ) : null}
            </div>
          </div>
          {/* --- End Charts --- */}


          {/* --- Actions --- */}
          <div className="report-actions" style={{ marginTop: '20px', textAlign: 'center' }}>
            <button
              onClick={handleDownloadVendorCsv}
              className="btn btn-secondary me-2" // Using Bootstrap classes assumed available
              disabled={!vendorReportData?.csvData?.length}
              title={!vendorReportData?.csvData?.length ? "No vendor data to download" : "Download vendor spending as CSV"}
            >
              Download Vendor CSV
            </button>
            <button
              onClick={handleDownloadTagCsv}
              className="btn btn-secondary" // Using Bootstrap classes assumed available
              disabled={!tagReportData?.csvData?.length}
              title={!tagReportData?.csvData?.length ? "No tag data to download" : "Download tag spending as CSV"}
            >
              Download Tag CSV
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reporting;
