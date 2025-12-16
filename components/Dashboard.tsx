import React from 'react';
import { DailyMetrics } from '../types';
import { DollarSign, BedDouble, Users, TrendingUp, LogIn, LogOut } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  color: string;
  subtext?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon: Icon, color, subtext }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-start justify-between hover:shadow-md transition-shadow">
    <div>
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
      {subtext && <p className="text-xs text-slate-400 mt-1">{subtext}</p>}
    </div>
    <div className={`p-3 rounded-lg ${color} text-white shadow-lg shadow-${color}/30`}>
      <Icon size={24} />
    </div>
  </div>
);

export const Dashboard: React.FC<{ metrics: DailyMetrics }> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <MetricCard 
        title="RevPAR" 
        value={`₹${metrics.revPar.toFixed(0)}`} 
        icon={TrendingUp} 
        color="bg-indigo-600"
        subtext="Rev. Per Available Room"
      />
      <MetricCard 
        title="Occupancy" 
        value={`${metrics.occupancyRate.toFixed(0)}%`} 
        icon={BedDouble} 
        color="bg-emerald-500"
        subtext={`${metrics.activeBookings} active rooms`}
      />
      <MetricCard 
        title="Total Revenue" 
        value={`₹${metrics.totalRevenue.toLocaleString()}`} 
        icon={DollarSign} 
        color="bg-blue-600"
        subtext="Lifetime Revenue"
      />
      <MetricCard 
        title="Front Desk Ops" 
        value={`${metrics.checkInsToday + metrics.checkOutsToday}`} 
        icon={Users} 
        color="bg-orange-500"
        subtext={`${metrics.checkInsToday} In / ${metrics.checkOutsToday} Out`}
      />
    </div>
  );
};