import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

// PIE CHART FOR QUESTION BREAKDOWN (CORRECT, INCORRECT, SKIPPED)
export const MarksheetPieChart: React.FC<{
    correct: number;
    incorrect: number;
    skipped: number;
}> = ({ correct, incorrect, skipped }) => {

    const data = [
        { name: 'Correct', value: correct, color: '#22c55e' }, // green-500
        { name: 'Incorrect', value: incorrect, color: '#ef4444' }, // red-500
        { name: 'Skipped', value: skipped, color: '#cbd5e1' }, // slate-300
    ].filter(d => d.value > 0); // Only show segments with values

    if (data.length === 0) return <div className="text-center text-slate-500 text-xs py-4">No data available.</div>;

    return (
        <div className="w-full h-48 sm:h-64 relative flex items-center justify-center">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} style={{ outline: 'none' }} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                        itemStyle={{ color: '#334155' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#475569' }} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};

// BAR CHART FOR TOPIC WISE PERFORMANCE
export const MarksheetTopicBarChart: React.FC<{
    topicAnalysis: Record<string, { correct: number, total: number, percentage: number }>;
}> = ({ topicAnalysis }) => {

    const data = Object.keys(topicAnalysis).map(topic => {
        const stats = topicAnalysis[topic];
        return {
            name: topic.length > 15 ? topic.substring(0, 15) + '...' : topic,
            fullName: topic,
            percentage: stats.percentage,
            correct: stats.correct,
            total: stats.total
        };
    });

    if (data.length === 0) return null;

    // Identify the weakest subject/topic specifically
    const weakestTopic = data.reduce((prev, current) => current.percentage < prev.percentage ? current : prev, data[0]);

    // Custom Bar to handle color mapping based on performance relative to weakest
    const CustomBar = (props: any) => {
        const { x, y, width, height, payload } = props;
        // If this is the definitively lowest scoring topic, mark it red. Otherwise default color.
        let fill = '#3b82f6'; // Default blue
        if (payload.fullName === weakestTopic.fullName) {
             fill = '#ef4444'; // Red for weakest
        } else if (payload.percentage >= 80) {
             fill = '#22c55e'; // Green for strong
        }

        return <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} ry={4} />;
    };

    return (
         <div className="w-full h-64 mt-6">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }}
                        domain={[0, 100]}
                        dx={-10}
                        tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                    <div className="bg-white p-3 rounded-xl shadow-lg border border-slate-100 text-xs">
                                        <p className="font-black text-slate-800 mb-1">{data.fullName}</p>
                                        <p className="text-slate-600 font-bold mb-0.5">Score: <span className={data.percentage >= 80 ? 'text-green-600' : data.percentage >= 50 ? 'text-blue-600' : 'text-red-600'}>{data.percentage}%</span></p>
                                        <p className="text-slate-500 font-medium">{data.correct} / {data.total} Correct</p>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />
                    <Bar dataKey="percentage" shape={<CustomBar />} barSize={32} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
