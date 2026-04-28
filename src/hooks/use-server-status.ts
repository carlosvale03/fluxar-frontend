"use client"

import { useState, useEffect } from 'react'
import { serverStatusManager } from '@/services/serverStatus'

export function useServerStatus() {
    const [isWakingUp, setIsWakingUp] = useState(false)

    useEffect(() => {
        const unsubscribe = serverStatusManager.subscribe((status) => {
            setIsWakingUp(status)
        })
        return unsubscribe
    }, [])

    return { isWakingUp }
}
