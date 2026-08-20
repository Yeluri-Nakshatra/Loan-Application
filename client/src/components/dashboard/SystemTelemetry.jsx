import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, BarChart, Bar } from 'recharts';
import { Activity, Server, Cpu, RefreshCw, AlertCircle } from 'lucide-react';
import axios from 'axios';

export default function SystemTelemetry() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchTelemetry = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:5000/api/telemetry', { withCredentials: true });
      setData(res.data);
      setError(null);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setError("Failed to synchronize with Grafana Cloud. Retrying in background...");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end pb-4 border-b border-slate-200 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-900" />
            System Telemetry
          </h1>
          <p className="text-sm text-slate-500 mt-1">Live infrastructure monitoring powered by Grafana Cloud.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-emerald-500 animate-pulse'}`}></div>
            {error ? 'CONNECTION LOST' : 'SYSTEM HEALTHY'}
          </span>
          <button 
            onClick={fetchTelemetry}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sync Now
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm font-semibold">{error}</div>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* API Traffic Spike */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                Live API Traffic (Requests/sec)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Last 60 Minutes • Global Edge Network</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-slate-900 font-mono">
                {data.length > 0 ? data[data.length-1].apiHits : 0} <span className="text-sm text-slate-400 font-sans font-bold">req/s</span>
              </div>
            </div>
          </div>
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorApi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="time" tick={{fontSize: 10, fill: '#64748b'}} tickMargin={10} minTickGap={30} />
                <YAxis tick={{fontSize: 10, fill: '#64748b'}} width={35} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold'}}
                  itemStyle={{color: '#1e293b'}}
                />
                <Area type="monotone" dataKey="apiHits" name="API Requests/sec" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorApi)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CPU Load */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-600" />
                CPU Utilization
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Core Processing Load</p>
            </div>
          </div>
          <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="time" tick={{fontSize: 10, fill: '#64748b'}} minTickGap={30} />
                <YAxis tick={{fontSize: 10, fill: '#64748b'}} width={35} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{borderRadius: '8px', fontSize: '12px'}} />
                <Line type="monotone" dataKey="cpuUsage" name="CPU Load" stroke="#9333ea" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Memory Usage */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-600" />
                Memory Consumption
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Resident Set Size (MB)</p>
            </div>
            <div className="text-right">
              <div className="text-xl font-black text-slate-900 font-mono">
                {data.length > 0 ? data[data.length-1].memoryMB : 0} <span className="text-xs text-slate-400 font-sans font-bold">MB</span>
              </div>
            </div>
          </div>
          <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="time" tick={{fontSize: 10, fill: '#64748b'}} minTickGap={30} />
                <YAxis tick={{fontSize: 10, fill: '#64748b'}} width={45} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{borderRadius: '8px', fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="memoryMB" name="RAM (MB)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
