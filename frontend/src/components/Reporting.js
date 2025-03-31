// frontend/src/components/Reporting.js
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { API_BASE_URL } from '../constants';


// Register Chart.js components including ArcElement
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Helper function for generating colors (simple example)
const generateColors = (numColors) => {
  const colors = [
    'rgba(255, 99, 132, 0.6)', 'rgba(54, 162, 235, 0.6)', 'rgba(255, 206, 86, 0.6)',
    'rgba(75, 192, 192, 0.6)', 'rgba(153, 102, 255, 0.6)', 'rgba(255, 159, 64, 0.6)',
    'rgba(99, 255, 132, 0.6)', 'rgba(235, 54, 162, 0.6)', 'rgba(86, 255, 206, 0.6)',
    'rgba(192, 75, 192, 0.6)', 'rgba(255, 102, 153, 0.6)', 'rgba(64, 255, 159, 0.6)',
  ];
  // Repeat colors if more data points than predefined colors
  return Array.from({ length: numColors }, (_, i) => colors[i % colors.length]);
};


function Reporting({ setError }) {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const barChartRef = useRef(null);
  const pieChartRef = useRef(null);

  useEffect(() => {
    // ... (fetchReportData remains the same) ...
    const fetchReportData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const response = await axios.get(`${API_BASE_URL}/reports/spending-by-vendor`);
        setReportData(response.data);
      } catch (err) {
        console.error("Fetch report error:", err);
        setError(err.response?.data?.message || err.message || "Failed to fetch report data.");
        setReportData(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReportData();
  }, [setError]);


  // --- Shared Tooltip Callback ---
  const tooltipLabelCallback = (context) => {
    let label = context.label || ''; // Pie chart uses label directly
    if (label) {
      label += ': ';
    }
    let value = context.parsed?.y ?? context.parsed; // Bar uses parsed.y, Pie uses parsed directly
    if (value !== null && !isNaN(value)) {
      label += new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    }
    return label;
  };


  // --- Bar Chart Config ---
  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false, // Allow custom height/width via container
    plugins: {
      legend: { display: false }, // Usually hide legend for single dataset bar charts
      title: { display: true, text: 'Total Spending by Vendor' },
      tooltip: { callbacks: { label: tooltipLabelCallback } } // Use shared callback
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
    labels: reportData?.labels || [],
    datasets: [ {
      label: 'Total Spent ($)', // Used in tooltip
      data: reportData?.data || [],
      backgroundColor: 'rgba(54, 162, 235, 0.6)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1,
    }],
  };


  // --- Pie Chart Config ---
  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false, // Allow custom height/width via container
    plugins: {
      legend: { position: 'top' }, // Show legend for pie slices
      title: { display: true, text: 'Spending Distribution by Vendor'},
      tooltip: { callbacks: { label: tooltipLabelCallback } } // Use shared callback
    }
  };

  const pieChartData = {
    labels: reportData?.labels || [], // Vendor names
    datasets: [ {
      label: 'Total Spent ($)', // Used in tooltip
      data: reportData?.data || [],
      backgroundColor: generateColors(reportData?.data?.length || 0), // Generate slice colors
      borderColor: generateColors(reportData?.data?.length || 0).map(color => color.replace('0.6', '1')), // Make borders solid
      borderWidth: 1,
    }],
  };


  // --- CSV Download Handler --- (remains the same)
  const handleDownloadCsv = () => { /* ... existing code ... */ };


  return (
    <div>
      <h2>Reports</h2>

      {isLoading ? (
        <p className="loading-message">Loading report data...</p>
      ) : !reportData || reportData.labels.length === 0 ? (
        <p>No spending data available to report.</p>
      ) : (
        <div className="report-container">
          {/* --- Layout for Charts (Example using simple divs/flexbox) --- */}
          <div className="charts-wrapper" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginBottom: '30px' }}>
            {/* Bar Chart */}
            <div className="chart-container" style={{ flex: '1 1 400px', minWidth: '300px', height: '400px', position: 'relative' }}>
              <Bar ref={barChartRef} options={barChartOptions} data={barChartData} key={`bar-${JSON.stringify(reportData)}`} />
            </div>
            {/* Pie Chart */}
            <div className="chart-container" style={{ flex: '1 1 350px', minWidth: '250px', height: '400px', position: 'relative' }}>
              <Pie ref={pieChartRef} options={pieChartOptions} data={pieChartData} key={`pie-${JSON.stringify(reportData)}`} />
            </div>
          </div>
          {/* --- End Layout --- */}

          {/* --- Actions --- */}
          <div className="report-actions" style={{ marginTop: '20px', textAlign: 'center' }}>
            <button onClick={handleDownloadCsv} className="btn btn-secondary"> {/* Example Bootstrap button class */}
              Download CSV Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reporting;
