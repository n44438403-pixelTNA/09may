import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts';

interface Props {
  activeFilter: 'WEAK' | 'AVERAGE' | 'STRONG' | 'EXCELLENT';
  data: {
    name: string;
    value: number;
    color: string;
    filterId: 'WEAK' | 'AVERAGE' | 'STRONG' | 'EXCELLENT';
  }[];
  onSegmentClick: (filterId: 'WEAK' | 'AVERAGE' | 'STRONG' | 'EXCELLENT') => void;
}

export const RevisionDonutChart: React.FC<Props> = ({ data, activeFilter, onSegmentClick }) => {
  // Sync internal state with props
  const [activeSegment, setActiveSegment] = useState<'WEAK' | 'AVERAGE' | 'STRONG' | 'EXCELLENT' | null>(activeFilter);

  useEffect(() => {
    setActiveSegment(activeFilter);
  }, [activeFilter]);

  // Calculate overall mastery percentage
  const totalTopics = data.reduce((sum, item) => sum + item.value, 0);

  const masteryTopics = data.filter(d => d.filterId === 'STRONG' || d.filterId === 'EXCELLENT').reduce((sum, item) => sum + item.value, 0);
  const overallPercentage = totalTopics > 0 ? Math.round((masteryTopics / totalTopics) * 100) : 0;

  // Find currently selected segment data
  const selectedData = activeSegment ? data.find(d => d.filterId === activeSegment) : null;
  const displayValue = selectedData ? selectedData.value : totalTopics;

  // Calculate percentage of selected slice relative to total
  const displayPercentage = totalTopics > 0 && selectedData
    ? Math.round((displayValue / totalTopics) * 100)
    : overallPercentage;

  let centerText = "Overview";
  if (totalTopics > 0 && selectedData) {
      // Use general descriptors instead of strictly matching the category name outside
      if (activeSegment === 'EXCELLENT') centerText = "Mastery Score";
      else if (activeSegment === 'STRONG') centerText = "Strong Score";
      else if (activeSegment === 'AVERAGE') centerText = "Average Score";
      else if (activeSegment === 'WEAK') centerText = "Needs Work";
  } else if (totalTopics > 0 && !selectedData) {
      // Overview state defaults to Master percentage label
      centerText = "Overall Mastery";
  }

  const weakCount = data.find(d => d.filterId === 'WEAK')?.value || 0;

  let aiSuggestion = "";
  if (totalTopics > 0 && weakCount > 0) {
      aiSuggestion = `🤖 Focus on Weak Topics - ${weakCount} pending`;
  } else if (totalTopics > 0) {
      aiSuggestion = `🤖 Great job! Keep revising to maintain mastery.`;
  } else {
      aiSuggestion = `🤖 Complete more tests to see your strength breakdown!`;
  }

  return (
    <div className="w-full mb-6">
      {aiSuggestion && (
          <div className="w-full text-center mb-4 flex items-center justify-center">
              <span className="text-sm font-bold text-slate-700 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200 backdrop-blur-sm">
                  {aiSuggestion}
              </span>
          </div>
      )}

      <div className="w-full h-80 relative cursor-pointer group flex flex-col items-center">
        {totalTopics > 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10" style={{ transform: 'translateY(-12px)' }}>
                <span className="text-5xl font-black text-slate-800 tracking-tighter transition-all duration-300 group-hover:scale-105">{displayPercentage}%</span>
                <span className="text-sm font-bold text-slate-600 mt-1 transition-all duration-300">{centerText}</span>
            </div>
        ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10" style={{ transform: 'translateY(-12px)' }}>
                <span className="text-5xl font-black text-slate-300 tracking-tighter">0%</span>
                <span className="text-sm font-bold text-slate-400 mt-1">Mastery</span>
            </div>
        )}
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={totalTopics > 0 ? data : [{ name: 'Empty', value: 1, color: '#f8fafc', filterId: 'NONE' }]}
              cx="50%"
              cy="50%"
              innerRadius={85}
              outerRadius={110}
              paddingAngle={totalTopics > 0 ? 5 : 0}
              dataKey="value"
              onClick={(entry) => {
                  if (totalTopics > 0 && entry && entry.payload && entry.payload.filterId) {
                      const id = entry.payload.filterId;
                      // Instantly update local segment for mobile tap feedback
                      setActiveSegment(id);
                      // Fire parent callback
                      onSegmentClick(id as any);
                  }
              }}
              onMouseEnter={(_, index) => {
                  if(totalTopics > 0) {
                      const id = data[index]?.filterId;
                      if(id) setActiveSegment(id);
                  }
              }}
              onMouseLeave={() => {
                  if(totalTopics > 0) setActiveSegment(activeFilter);
              }}
              isAnimationActive={true}
              stroke="none"
              cornerRadius={8}
            >
              {(totalTopics > 0 ? data : [{ name: 'Empty', value: 1, color: '#f8fafc', filterId: 'NONE' }]).map((entry, index) => {
                let cellColor = entry.color;
                if (totalTopics > 0) {
                    if (entry.filterId === 'WEAK') cellColor = '#ef4444';
                    else if (entry.filterId === 'STRONG') cellColor = '#22c55e';
                    else if (entry.filterId === 'EXCELLENT') cellColor = '#8b5cf6';
                    else if (entry.filterId === 'AVERAGE') cellColor = '#f59e0b';
                }

                const isSelected = activeSegment === entry.filterId;

                return (
                  <Cell
                      key={`cell-${index}`}
                      fill={cellColor}
                      className={totalTopics > 0 ? "cursor-pointer transition-all duration-300 ease-out" : ""}
                      style={totalTopics > 0 ? {
                          outline: 'none',
                          opacity: isSelected ? 1 : 0.6,
                          filter: isSelected ? `drop-shadow(0 0 8px ${cellColor}90)` : 'none',
                          transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                          transformOrigin: 'center'
                      } : { outline: 'none' }}
                  />
                );
              })}
            </Pie>
            <Legend
                verticalAlign="bottom"
                height={60}
                iconType="circle"
                wrapperStyle={{ fontSize: '13px', fontWeight: 'bold', color: '#475569', paddingTop: '24px' }}
                payload={data.map(item => {
                    let legendColor = item.color;
                    if (item.filterId === 'WEAK') legendColor = '#ef4444';
                    else if (item.filterId === 'STRONG') legendColor = '#22c55e';
                    else if (item.filterId === 'EXCELLENT') legendColor = '#8b5cf6';
                    else if (item.filterId === 'AVERAGE') legendColor = '#f59e0b';
                    return {
                        id: item.name,
                        type: "circle",
                        value: item.name,
                        color: legendColor
                    };
                })}
            />
          </PieChart>
        </ResponsiveContainer>

      </div>
    </div>
  );
};
