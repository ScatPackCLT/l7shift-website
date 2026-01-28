'use client'

import { useState } from 'react'
import { StatusPill } from './StatusPill'

type TaskStatus = 'backlog' | 'active' | 'review' | 'shipped'

interface Task {
  id: string
  title: string
  description?: string
  status: TaskStatus
  priority: 'low' | 'medium' | 'high' | 'urgent'
  shiftHours: number
  traditionalEstimate: number
  assignedTo?: string
}

interface KanbanBoardProps {
  tasks: Task[]
  onTaskMove?: (taskId: string, newStatus: TaskStatus) => void
  onTaskClick?: (task: Task) => void
}

const columns: { status: TaskStatus; title: string; color: string }[] = [
  { status: 'backlog', title: 'Backlog', color: '#888' },
  { status: 'active', title: 'Active', color: '#00F0FF' },
  { status: 'review', title: 'In Review', color: '#FF00AA' },
  { status: 'shipped', title: 'Shipped', color: '#BFFF00' },
]

const priorityColors = {
  low: '#666',
  medium: '#888',
  high: '#FFAA00',
  urgent: '#FF4444',
}

export function KanbanBoard({ tasks, onTaskMove, onTaskClick }: KanbanBoardProps) {
  const [draggedTask, setDraggedTask] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null)

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId)
  }

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault()
    setDragOverColumn(status)
  }

  const handleDragLeave = () => {
    setDragOverColumn(null)
  }

  const handleDrop = (status: TaskStatus) => {
    if (draggedTask && onTaskMove) {
      onTaskMove(draggedTask, status)
    }
    setDraggedTask(null)
    setDragOverColumn(null)
  }

  const getColumnTasks = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status)

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
        height: '100%',
        minHeight: 500,
      }}
    >
      {columns.map((column) => {
        const columnTasks = getColumnTasks(column.status)
        const isDropTarget = dragOverColumn === column.status

        return (
          <div
            key={column.status}
            onDragOver={(e) => handleDragOver(e, column.status)}
            onDragLeave={handleDragLeave}
            onDrop={() => handleDrop(column.status)}
            style={{
              background: isDropTarget
                ? `${column.color}11`
                : 'rgba(255, 255, 255, 0.02)',
              border: `1px solid ${isDropTarget ? column.color : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: 12,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              transition: 'all 0.2s ease',
            }}
          >
            {/* Column header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 16,
                paddingBottom: 12,
                borderBottom: `2px solid ${column.color}33`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: column.color,
                    boxShadow: `0 0 8px ${column.color}66`,
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#FAFAFA',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {column.title}
                </span>
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: column.color,
                  background: `${column.color}22`,
                  padding: '2px 8px',
                  borderRadius: 10,
                }}
              >
                {columnTasks.length}
              </span>
            </div>

            {/* Tasks */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {columnTasks.map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => handleDragStart(task.id)}
                  onClick={() => onTaskClick?.(task)}
                  className="task-card"
                  style={{
                    padding: 12,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 8,
                    cursor: 'grab',
                    opacity: draggedTask === task.id ? 0.5 : 1,
                    transition: 'all 0.2s ease',
                    borderLeft: `3px solid ${priorityColors[task.priority]}`,
                  }}
                >
                  {/* Title */}
                  <h4
                    style={{
                      margin: 0,
                      fontSize: 13,
                      fontWeight: 500,
                      color: '#FAFAFA',
                      lineHeight: 1.4,
                    }}
                  >
                    {task.title}
                  </h4>

                  {/* Description preview */}
                  {task.description && (
                    <p
                      style={{
                        margin: '6px 0 0',
                        fontSize: 11,
                        color: '#666',
                        lineHeight: 1.4,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {task.description}
                    </p>
                  )}

                  {/* Hours bar - shows shift hours vs traditional estimate */}
                  {task.traditionalEstimate > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div
                        style={{
                          height: 6,
                          background: 'rgba(255, 0, 170, 0.4)',
                          borderRadius: 3,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${Math.min((task.shiftHours / task.traditionalEstimate) * 100, 100)}%`,
                            background: 'linear-gradient(90deg, #00F0FF, #00A0FF)',
                            borderRadius: 3,
                            boxShadow: '0 0 6px rgba(0, 240, 255, 0.4)',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    }}
                  >
                    {/* Hours */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 10, color: '#00F0FF' }}>
                        {task.shiftHours}h
                      </span>
                      <span style={{ fontSize: 10, color: '#444' }}>/</span>
                      <span style={{ fontSize: 10, color: '#FF00AA' }}>
                        {task.traditionalEstimate}h
                      </span>
                    </div>

                    {/* Assignee */}
                    {task.assignedTo && (
                      <div
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #00F0FF, #FF00AA)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 9,
                          fontWeight: 700,
                          color: '#0A0A0A',
                        }}
                      >
                        {task.assignedTo.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {columnTasks.length === 0 && (
                <div
                  style={{
                    padding: 20,
                    textAlign: 'center',
                    color: '#444',
                    fontSize: 12,
                  }}
                >
                  No tasks
                </div>
              )}
            </div>
          </div>
        )
      })}

      <style jsx>{`
        .task-card:hover {
          border-color: rgba(0, 240, 255, 0.3) !important;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
        }
        .task-card:active {
          cursor: grabbing;
        }
      `}</style>
    </div>
  )
}
