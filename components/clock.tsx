"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"

export function Clock() {
  const [currentTime, setCurrentTime] = useState<Date>(new Date())

  useEffect(() => {
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    // Cleanup interval on component unmount
    return () => clearInterval(timer)
  }, [])

  // Format time as HH:MM:SS (24-hour format is universal)
  const formattedTime = format(currentTime, "HH:mm:ss")

  return (
    <div
      className="text-sm text-foreground/60"
      title="Current time"
      aria-label="Current time"
    >
      {formattedTime}
    </div>
  )
}