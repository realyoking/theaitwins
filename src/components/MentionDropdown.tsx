import { Ghost, Cpu, Skull, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type MentionOption = {
  id: string;
  name: string;
  type: 'ai' | 'user';
  icon?: React.ReactNode;
};

interface MentionDropdownProps {
  query: string;
  members: { user_id: string; display_name: string }[];
  onSelect: (mention: string) => void;
  visible: boolean;
}

const AI_MODELS: MentionOption[] = [
  { id: 'anson67', name: 'anson67', type: 'ai', icon: <Ghost className="w-4 h-4" /> },
  { id: 'gemini', name: 'gemini', type: 'ai', icon: <Cpu className="w-4 h-4" /> },
  { id: 'chester', name: 'chester', type: 'ai', icon: <Skull className="w-4 h-4" /> },
];

const MentionDropdown = ({ query, members, onSelect, visible }: MentionDropdownProps) => {
  const searchTerm = query.toLowerCase();
  
  // Filter AI models
  const filteredAI = AI_MODELS.filter(m => 
    m.name.toLowerCase().includes(searchTerm)
  );
  
  // Filter members
  const filteredMembers = members
    .filter(m => m.display_name?.toLowerCase().includes(searchTerm))
    .map(m => ({
      id: m.user_id,
      name: m.display_name,
      type: 'user' as const,
      icon: <User className="w-4 h-4" />,
    }));

  const allOptions = [...filteredAI, ...filteredMembers];

  if (!visible || allOptions.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto"
      >
        {/* AI Models Section - Pinned at top */}
        {filteredAI.length > 0 && (
          <div className="p-2 border-b border-border">
            <p className="text-[9px] font-bold text-muted-foreground uppercase px-2 mb-1">AI Models</p>
            {filteredAI.map(option => (
              <button
                key={option.id}
                onClick={() => onSelect(option.name)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-lg transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                  {option.icon}
                </div>
                <span className="text-sm font-medium">@{option.name}</span>
                <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded ml-auto">AI</span>
              </button>
            ))}
          </div>
        )}

        {/* Members Section */}
        {filteredMembers.length > 0 && (
          <div className="p-2">
            <p className="text-[9px] font-bold text-muted-foreground uppercase px-2 mb-1">Members</p>
            {filteredMembers.map(option => (
              <button
                key={option.id}
                onClick={() => onSelect(option.name)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-lg transition-colors"
              >
                <div className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px] font-bold">
                  {option.name?.[0]?.toUpperCase() || '?'}
                </div>
                <span className="text-sm font-medium">@{option.name}</span>
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default MentionDropdown;
