"use client"

import React from "react"
import { motion } from "framer-motion"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface TabItem {
  name: string
  id: string
  icon?: LucideIcon
}

interface TabNavProps {
  items: TabItem[]
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
}

export function TabNav({ items, activeTab, onTabChange, className }: TabNavProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center gap-2 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 backdrop-blur-lg py-1 px-1 rounded-full shadow-lg">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "relative cursor-pointer text-sm font-semibold px-6 py-2 rounded-full transition-colors flex items-center gap-2",
                "text-gray-600 hover:text-blue-600",
                isActive && "text-blue-600",
              )}
            >
              {Icon && <Icon size={16} strokeWidth={2.5} />}
              <span>{item.name}</span>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 w-full bg-blue-50 dark:bg-blue-900/20 rounded-full -z-10"
                  initial={false}
                  transition={{
                    type: "spring" as const,
                    stiffness: 300,
                    damping: 30,
                  }}
                >
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-t-full">
                    <div className="absolute w-12 h-6 bg-blue-400/20 rounded-full blur-md -top-2 -left-2" />
                    <div className="absolute w-8 h-6 bg-blue-400/20 rounded-full blur-md -top-1" />
                    <div className="absolute w-4 h-4 bg-blue-400/20 rounded-full blur-sm top-0 left-2" />
                  </div>
                </motion.div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
