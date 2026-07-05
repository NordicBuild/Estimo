import React, { useState, useEffect, Suspense, lazy } from 'react';
import { supabase } from '../supabase';

import AnalysCharts from './AnalysCharts';

export function AdminAnalysTab() {
  const [stats, setStats] = useState<any>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Fetch KPI stats
      const { data: statsData, error: statsError } = await supabase.rpc('get_platform_stats');
      if (statsError) throw statsError;
      setStats(statsData);

      // 2. Fetch trends for companies and projects (last 12 months)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
      twelveMonthsAgo.setDate(1);
      twelveMonthsAgo.setHours(0, 0, 0, 0);

      const [companiesRes, projectsRes] = await Promise.all([
        supabase.from('companies').select('created_at').gte('created_at', twelveMonthsAgo.toISOString()),
        supabase.from('projects').select('created_at').gte('created_at', twelveMonthsAgo.toISOString())
      ]);

      const monthlyData: Record<string, { företag: number; projekt: number }> = {};
      
      // Initialize last 12 months
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthLabel = d.toLocaleString('sv-SE', { month: 'short', year: 'numeric' });
        monthlyData[monthLabel] = { företag: 0, projekt: 0 };
      }

      if (companiesRes.data) {
        companiesRes.data.forEach(c => {
          if (!c.created_at) return;
          const label = new Date(c.created_at).toLocaleString('sv-SE', { month: 'short', year: 'numeric' });
          if (monthlyData[label]) monthlyData[label].företag += 1;
        });
      }

      if (projectsRes.data) {
        projectsRes.data.forEach(p => {
          if (!p.created_at) return;
          const label = new Date(p.created_at).toLocaleString('sv-SE', { month: 'short', year: 'numeric' });
          if (monthlyData[label]) monthlyData[label].projekt += 1;
        });
      }

      const formattedTrendData = Object.keys(monthlyData).map(key => ({
        month: key,
        företag: monthlyData[key].företag,
        projekt: monthlyData[key].projekt
      }));

      setTrendData(formattedTrendData);

      // 3. Fetch recent audit logs
      const { data: logsData, error: logsError } = await supabase
        .from('audit_log')
        .select(`
          id,
          event,
          created_at,
          companies ( name )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (logsError) throw logsError;
      setAuditLogs(logsData || []);

    } catch (e) {
      // warning removed
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Laddar plattformsanalys...</div>;
  }

  // Format plan data for chart
  const planData = stats?.by_plan ? Object.keys(stats.by_plan).map(key => ({
    name: key === '1' ? 'Bas' : key === '2' ? 'Pro' : key, // Simple mapping, could be improved if plans are dynamic
    value: stats.by_plan[key]
  })) : [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <i className="fa-solid fa-chart-line mr-3 text-[var(--blue)]"></i>
        Plattformsanalys
      </h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex items-center">
          <div className="bg-blue-50 text-[var(--blue)] w-12 h-12 rounded-full flex items-center justify-center text-xl mr-4">
            <i className="fa-solid fa-building"></i>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-800">{stats?.companies || 0}</div>
            <div className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Företag</div>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex items-center">
          <div className="bg-blue-50 text-[var(--blue)] w-12 h-12 rounded-full flex items-center justify-center text-xl mr-4">
            <i className="fa-solid fa-users"></i>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-800">{stats?.users || 0}</div>
            <div className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Användare</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex items-center">
          <div className="bg-green-50 text-green-600 w-12 h-12 rounded-full flex items-center justify-center text-xl mr-4">
            <i className="fa-solid fa-folder-open"></i>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-800">{stats?.projects || 0}</div>
            <div className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Projekt (Totalt)</div>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex items-center">
          <div className="bg-purple-50 text-purple-600 w-12 h-12 rounded-full flex items-center justify-center text-xl mr-4">
            <i className="fa-solid fa-money-bill-trend-up"></i>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-800">{new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(stats?.mrr || 0)}</div>
            <div className="text-sm text-gray-500 uppercase tracking-wider font-semibold">MRR</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
         <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
            <div className="text-sm text-gray-500 uppercase tracking-wider font-semibold mb-1">Aktiva Prenumerationer</div>
            <div className="text-2xl font-bold text-blue-600">{stats?.active_subs || 0}</div>
         </div>
         <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
            <div className="text-sm text-gray-500 uppercase tracking-wider font-semibold mb-1">Obetalda Fakturor</div>
            <div className="text-2xl font-bold text-amber-600">{stats?.invoices_unpaid || 0}</div>
         </div>
         <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-center items-center text-center">
            <div className="text-sm text-gray-500 uppercase tracking-wider font-semibold mb-1">Betald Omsättning</div>
            <div className="text-2xl font-bold text-green-600">{new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(stats?.revenue_paid || 0)}</div>
         </div>
      </div>

      <Suspense fallback={<div className="h-64 flex items-center justify-center text-gray-400 bg-white border border-gray-100 rounded-lg">Laddar diagram...</div>}>
        <AnalysCharts planData={planData} trendData={trendData} />
      </Suspense>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-800">Senaste Händelser (Audit Log)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-600 border-b">
              <tr>
                <th className="px-6 py-3 font-medium">Tidpunkt</th>
                <th className="px-6 py-3 font-medium">Företag</th>
                <th className="px-6 py-3 font-medium">Händelse</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {auditLogs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString('sv-SE')}
                  </td>
                  <td className="px-6 py-3 font-medium text-gray-800">
                    {log.companies?.name || '-'}
                  </td>
                  <td className="px-6 py-3">
                    <span className="inline-block bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                      {log.event}
                    </span>
                  </td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                    Inga händelser registrerade ännu.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
