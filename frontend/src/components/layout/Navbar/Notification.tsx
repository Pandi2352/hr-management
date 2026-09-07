import { Bell, CheckCircle2, Clock } from "lucide-react";
import { Dropdown } from "../../ui/Dropdown";

export function Notification() {
  const notifications = [
    {
      id: "1",
      title: "Leave Approved",
      desc: "Your casual leave request for tomorrow was approved.",
      time: "10m ago",
      icon: CheckCircle2,
      color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50",
    },
    {
      id: "2",
      title: "Clock-In Reminder",
      desc: "Don't forget to mark your daily attendance punch.",
      time: "1h ago",
      icon: Clock,
      color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/50",
    },
  ];

  return (
    <Dropdown
      trigger={
        <button className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600"></span>
          </span>
        </button>
      }
      className="w-80 p-2"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white">
          Notifications
        </span>
        <span className="text-[11px] text-indigo-600 dark:text-indigo-400 cursor-pointer hover:underline">
          Mark all as read
        </span>
      </div>
      <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-72 overflow-y-auto">
        {notifications.map((n) => {
          const Icon = n.icon;
          return (
            <div
              key={n.id}
              className="flex items-start gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg cursor-pointer transition-colors"
            >
              <div className={`p-2 rounded-lg ${n.color} shrink-0`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {n.title}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                  {n.desc}
                </p>
                <span className="text-[10px] text-slate-400 mt-1 block">{n.time}</span>
              </div>
            </div>
          );
        })}
      </div>
    </Dropdown>
  );
}
