import { useState } from 'react';
import { X, Plus, MessageSquare, GripVertical } from 'lucide-react';
import { useAppStore } from '@/lib/store';

interface WorkspaceTab {
  id: string;
  conversationId: string;
  name: string;
}

interface WorkspaceTabsProps {
  tabs: WorkspaceTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onNewTab: () => void;
}

const WorkspaceTabs = ({ tabs, activeTabId, onSelectTab, onCloseTab, onNewTab }: WorkspaceTabsProps) => {
  if (tabs.length <= 1) return null;

  return (
    <div className="shrink-0 h-9 flex items-center bg-muted/50 border-b border-border px-1 gap-0.5 overflow-x-auto custom-scrollbar">
      {tabs.map(tab => (
        <div key={tab.id}
          className={`group flex items-center gap-1 px-3 py-1.5 rounded-t-lg text-[11px] font-medium cursor-pointer transition-colors min-w-0 max-w-[180px] ${
            tab.id === activeTabId
              ? 'bg-background text-foreground border-t border-x border-border -mb-px'
              : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
          }`}
          onClick={() => onSelectTab(tab.id)}>
          <MessageSquare className="w-3 h-3 shrink-0" />
          <span className="truncate flex-1">{tab.name}</span>
          {tabs.length > 1 && (
            <button onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id); }}
              className="shrink-0 p-0.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ))}
      <button onClick={onNewTab}
        className="shrink-0 p-1.5 text-muted-foreground hover:text-foreground hover:bg-background/50 rounded-lg transition-colors ml-1">
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export type { WorkspaceTab };
export default WorkspaceTabs;
