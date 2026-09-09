import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '../../../utils/cn';
import type { OrgChartNode as OrgChartNodeType } from '../types/organization.types';

interface OrgChartNodeProps {
  node: OrgChartNodeType;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onSelectEmployee: (node: OrgChartNodeType) => void;
  searchQuery?: string;
  selectedDeptId?: string;
  highlightedId?: string | null;
}

export const OrgChartNode: React.FC<OrgChartNodeProps> = ({
  node,
  expandedIds,
  onToggleExpand,
  onSelectEmployee,
  searchQuery = '',
  selectedDeptId = 'ALL',
  highlightedId,
}) => {
  const isExpanded = expandedIds.has(node._id);
  const hasChildren = node.children && node.children.length > 0;

  // Search matching
  const isSearchMatch =
    Boolean(searchQuery.trim()) &&
    (node.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.designationTitle.toLowerCase().includes(searchQuery.toLowerCase()));

  const isHighlighted = highlightedId === node._id || isSearchMatch;

  // Department filter matching
  const isDeptMatch =
    selectedDeptId === 'ALL' || node.departmentId === selectedDeptId;

  // Card header accent line tint based on designation level
  const getAccentBarColor = () => {
    if (node.designationCode === 'MD') return 'bg-teal-600';
    if (node.designationCode === 'CTO' || node.designationCode === 'VP') return 'bg-teal-500';
    if (node.designationCode === 'PE' || node.designationCode === 'DSE' || node.designationCode === 'DIR') return 'bg-emerald-600';
    if (node.designationCode === 'TL' || node.designationCode === 'PM' || node.designationCode === 'QAL') return 'bg-sky-600';
    return 'bg-teal-600';
  };

  return (
    <div className="flex flex-col items-center select-none">
      {/* Employee Card */}
      <div
        onClick={() => onSelectEmployee(node)}
        className={cn(
          'w-48 rounded-lg bg-white dark:bg-slate-900 border transition-all duration-200 cursor-pointer text-center relative shadow-xs hover:shadow-md group',
          isHighlighted
            ? 'ring-2 ring-amber-400 border-amber-400 dark:border-amber-400 shadow-md scale-[1.02]'
            : isDeptMatch
            ? 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            : 'opacity-40 border-slate-200 dark:border-slate-800'
        )}
      >
        {/* Top Accent Color Bar */}
        <div className={cn('h-1 w-full rounded-t-lg', getAccentBarColor())} />

        <div className="p-3 pt-2.5 flex flex-col items-center">
          {/* Circular Initials / Avatar */}
          <div className="relative mb-2">
            {node.avatarUrl ? (
              <img
                src={node.avatarUrl}
                alt={node.displayName}
                className="h-12 w-12 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-xs"
              />
            ) : (
              <div className="h-12 w-12 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-950/70 dark:text-cyan-300 font-bold text-xs tracking-wider flex items-center justify-center border border-cyan-200/60 dark:border-cyan-800/60 shadow-xs">
                {node.initials}
              </div>
            )}
          </div>

          {/* Full Name */}
          <h4
            className="text-[12.5px] font-bold text-slate-900 dark:text-slate-100 leading-snug w-full truncate px-1 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors"
            title={node.displayName}
          >
            {node.displayName}
          </h4>

          {/* Employee Code */}
          <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            {node.employeeCode}
          </span>

          {/* Designation */}
          <p
            className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 leading-tight mt-1 line-clamp-2 px-1"
            title={node.designationTitle}
          >
            {node.designationTitle}
          </p>

          {/* Department badge subtle */}
          <span className="text-[9.5px] text-slate-400 dark:text-slate-500 mt-1 truncate max-w-full px-1">
            {node.departmentName}
          </span>
        </div>
      </div>

      {/* Direct reports connector and tree */}
      {hasChildren && (
        <div className="flex flex-col items-center w-full">
          {/* Vertical connector line from card to toggle button */}
          <div className="w-0.5 h-4 bg-emerald-600 dark:bg-emerald-500" />

          {/* Circular Expand / Collapse Toggle Pill */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(node._id);
            }}
            title={isExpanded ? `Collapse ${node.directReportsCount} reports` : `Expand ${node.directReportsCount} reports`}
            className="h-5 w-5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center cursor-pointer shadow-xs transition-transform duration-150 hover:scale-110 ring-2 ring-white dark:ring-slate-950 z-10"
          >
            {isExpanded ? (
              <Minus className="h-3 w-3 stroke-[2.5]" />
            ) : (
              <Plus className="h-3 w-3 stroke-[2.5]" />
            )}
          </button>

          {/* Subtree Children (when expanded) */}
          {isExpanded && (
            <div className="flex flex-col items-center w-full">
              {/* Vertical line from toggle to horizontal bus */}
              <div className="w-0.5 h-5 bg-emerald-600 dark:bg-emerald-500" />

              {/* Children row with branching orthogonal connector lines */}
              <div className="flex items-start justify-center relative pt-4">
                {node.children.map((child, index) => {
                  const isFirst = index === 0;
                  const isLast = index === node.children.length - 1;
                  const isOnly = node.children.length === 1;

                  return (
                    <div
                      key={child._id}
                      className="relative flex flex-col items-center px-3"
                    >
                      {/* Horizontal connecting bus line */}
                      {!isOnly && (
                        <div
                          className={cn(
                            'absolute top-0 h-0.5 bg-emerald-600 dark:bg-emerald-500',
                            isFirst
                              ? 'left-1/2 right-0'
                              : isLast
                              ? 'left-0 right-1/2'
                              : 'left-0 right-0'
                          )}
                        />
                      )}

                      {/* Vertical drop line down into child card */}
                      <div className="w-0.5 h-4 bg-emerald-600 dark:bg-emerald-500 absolute top-0" />

                      {/* Recursive child node */}
                      <OrgChartNode
                        node={child}
                        expandedIds={expandedIds}
                        onToggleExpand={onToggleExpand}
                        onSelectEmployee={onSelectEmployee}
                        searchQuery={searchQuery}
                        selectedDeptId={selectedDeptId}
                        highlightedId={highlightedId}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
