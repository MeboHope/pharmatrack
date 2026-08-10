import React, { useState, useRef, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { ResponsiveContainer, AreaChart, CartesianGrid, XAxis, YAxis, Tooltip, Area } from 'recharts';
import { DispenseTransaction, PharmacySettings } from '../types';

interface SalesOverviewGraphProps {
  transactions: DispenseTransaction[];
  settings: PharmacySettings;
  selectId?: string;
}

// Helper to parse date strings in various formats
const parseTxnDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const matchUk = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,\s*|\s+)(\d{1,2}):(\d{1,2})/);
  if (matchUk) {
    return new Date(
      parseInt(matchUk[3], 10),
      parseInt(matchUk[2], 10) - 1,
      parseInt(matchUk[1], 10),
      parseInt(matchUk[4], 10),
      parseInt(matchUk[5], 10)
    );
  }
  const matchIso = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+|T)(\d{1,2}):(\d{1,2})/);
  if (matchIso) {
    return new Date(
      parseInt(matchIso[1], 10),
      parseInt(matchIso[2], 10) - 1,
      parseInt(matchIso[3], 10),
      parseInt(matchIso[4], 10),
      parseInt(matchIso[5], 10)
    );
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  return null;
};

export const SalesOverviewGraph: React.FC<SalesOverviewGraphProps> = ({
  transactions = [],
  settings,
  selectId = 'select-sales-overview-mode',
}) => {
  const [viewMode, setViewMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (scrollRef.current && e.deltaY !== 0 && !e.deltaX) {
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const chartData = useMemo(() => {
    const validTxns = (transactions || [])
      .filter((t) => t.status !== 'Cancelled')
      .map((t) => ({
        ...t,
        parsedDate: parseTxnDate(t.date),
      }))
      .filter((t): t is typeof t & { parsedDate: Date } => t.parsedDate !== null);

    if (viewMode === 'daily') {
      const now = new Date();
      let targetDate = now;

      const todayTxns = validTxns.filter((t) => 
        t.parsedDate.getFullYear() === now.getFullYear() &&
        t.parsedDate.getMonth() === now.getMonth() &&
        t.parsedDate.getDate() === now.getDate()
      );

      if (todayTxns.length === 0 && validTxns.length > 0) {
        const sorted = [...validTxns].sort((a, b) => b.parsedDate.getTime() - a.parsedDate.getTime());
        targetDate = sorted[0].parsedDate;
      }

      const dayTxns = validTxns.filter((t) => 
        t.parsedDate.getFullYear() === targetDate.getFullYear() &&
        t.parsedDate.getMonth() === targetDate.getMonth() &&
        t.parsedDate.getDate() === targetDate.getDate()
      );

      let startHour = 7; // Default starts at 7 AM
      let endHour = 19;  // Default ends at 7 PM

      dayTxns.forEach((t) => {
        const h = t.parsedDate.getHours();
        if (h < startHour) startHour = h;
        if (h > endHour) endHour = h;
      });

      const points: { label: string; sales: number }[] = [];
      for (let h = startHour; h <= endHour; h++) {
        const period = h >= 12 ? 'PM' : 'AM';
        const display12 = h % 12 === 0 ? 12 : h % 12;
        const label = `${display12}:00 ${period}`;

        const hourlySales = dayTxns
          .filter((t) => t.parsedDate.getHours() === h)
          .reduce((sum, t) => sum + (t.totalAmount || 0), 0);

        points.push({ label, sales: hourlySales });
      }

      const dateFormatted = targetDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      return {
        points,
        subtitle: `Hourly sales for ${dateFormatted} (starting ${startHour > 12 ? `${startHour - 12} PM` : `${startHour} AM`})`,
      };
    }

    if (viewMode === 'weekly') {
      const now = new Date();
      let refDate = now;
      if (validTxns.length > 0) {
        const sorted = [...validTxns].sort((a, b) => b.parsedDate.getTime() - a.parsedDate.getTime());
        if (sorted[0].parsedDate.getTime() > refDate.getTime()) {
          refDate = sorted[0].parsedDate;
        }
      }

      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const points: { label: string; sales: number }[] = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date(refDate);
        d.setDate(d.getDate() - i);

        const dayLabel = `${dayNames[d.getDay()]} (${d.getDate()}/${d.getMonth() + 1})`;

        const dailySales = validTxns
          .filter((t) => 
            t.parsedDate.getFullYear() === d.getFullYear() &&
            t.parsedDate.getMonth() === d.getMonth() &&
            t.parsedDate.getDate() === d.getDate()
          )
          .reduce((sum, t) => sum + (t.totalAmount || 0), 0);

        points.push({ label: dayLabel, sales: dailySales });
      }

      return {
        points,
        subtitle: `Daily sales performance per day`,
      };
    }

    // Monthly view mode
    const now = new Date();
    let refDate = now;
    if (validTxns.length > 0) {
      const sorted = [...validTxns].sort((a, b) => b.parsedDate.getTime() - a.parsedDate.getTime());
      refDate = sorted[0].parsedDate;
    }

    const targetYear = refDate.getFullYear();
    const targetMonth = refDate.getMonth();
    const monthName = refDate.toLocaleString('default', { month: 'long' });

    const monthTxns = validTxns.filter((t) => 
      t.parsedDate.getFullYear() === targetYear &&
      t.parsedDate.getMonth() === targetMonth
    );

    const weeks = [
      { label: 'Week 1 (1-7)', startDay: 1, endDay: 7 },
      { label: 'Week 2 (8-14)', startDay: 8, endDay: 14 },
      { label: 'Week 3 (15-21)', startDay: 15, endDay: 21 },
      { label: 'Week 4 (22-28)', startDay: 22, endDay: 28 },
      { label: 'Week 5 (29-31)', startDay: 29, endDay: 31 },
    ];

    const points = weeks.map((w) => {
      const weekSales = monthTxns
        .filter((t) => {
          const day = t.parsedDate.getDate();
          return day >= w.startDay && day <= w.endDay;
        })
        .reduce((sum, t) => sum + (t.totalAmount || 0), 0);

      return { label: w.label, sales: weekSales };
    });

    return {
      points,
      subtitle: `Weekly sales performance for ${monthName} ${targetYear}`,
    };
  }, [transactions, viewMode]);

  const totalPeriodSales = chartData.points.reduce((acc, p) => acc + p.sales, 0);

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-900 shrink-0">Sales Overview</h2>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0 max-w-full">
          <select
            id={selectId}
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as 'daily' | 'weekly' | 'monthly')}
            className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-[#22577A] cursor-pointer shadow-2xs max-w-full shrink-1 truncate"
          >
            <option value="daily">Daily (Hourly)</option>
            <option value="weekly">Weekly (Per Day)</option>
            <option value="monthly">Monthly (Per Week)</option>
          </select>
          <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1 shrink-0 whitespace-nowrap">
            <TrendingUp className="w-3.5 h-3.5 shrink-0" /> Total: {settings.currency} {totalPeriodSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-500 font-medium -mt-1">{chartData.subtitle}</p>

      {/* Horizontal Scroll Area Chart Container (supports Shift+scroll wheel) */}
      <div 
        ref={scrollRef} 
        onWheel={handleWheel}
        className="w-full overflow-x-auto overflow-y-hidden pb-2 cursor-grab active:cursor-grabbing scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100"
      >
        <div style={{ minWidth: `${Math.max(550, chartData.points.length * 65)}px`, height: '256px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData.points} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`salesGrad_${selectId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22577A" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#22577A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748B' }} />
              <YAxis tick={{ fontSize: 12, fill: '#64748B' }} tickFormatter={(val) => `${val}`} />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const val = payload[0].value as number;
                    return (
                      <div className="bg-[#22577A] text-white px-3 py-2 rounded-lg shadow-lg text-xs font-medium border border-[#1a4460]">
                        <div className="font-bold text-slate-100 mb-0.5">{label}</div>
                        <div>Sales: <span className="font-semibold">{settings.currency} {val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area type="monotone" dataKey="sales" stroke="#22577A" strokeWidth={3} fillOpacity={1} fill={`url(#salesGrad_${selectId})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
