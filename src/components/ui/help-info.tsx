"use client"

import { HelpCircle } from "lucide-react"
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogTrigger 
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { HELP_CONTENTS, HelpTopic } from "@/constants/help-texts"
import { cn } from "@/lib/utils"

interface HelpInfoProps {
    topic: HelpTopic
    className?: string
    iconClassName?: string
}

export function HelpInfo({ topic, className, iconClassName }: HelpInfoProps) {
    const content = HELP_CONTENTS[topic]

    if (!content) return null

    return (
        <Dialog>
            <DialogTrigger asChild>
                <button 
                    type="button"
                    className={cn(
                        "inline-flex items-center justify-center rounded-full text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors p-0.5 cursor-pointer",
                        className
                    )}
                >
                    <HelpCircle className={cn("h-3.5 w-3.5", iconClassName)} />
                </button>
            </DialogTrigger>
            <DialogContent className="max-w-[400px] rounded-[32px] p-8 border-none bg-background shadow-2xl">
                <DialogHeader className="space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                        <HelpCircle className="h-6 w-6" />
                    </div>
                    <DialogTitle className="text-xl font-black tracking-tight">
                        {content.title}
                    </DialogTitle>
                    <DialogDescription className="text-sm leading-relaxed font-medium text-muted-foreground/80">
                        {content.description}
                    </DialogDescription>
                </DialogHeader>
                <div className="pt-4">
                    <Button 
                        onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))}
                        className="w-full rounded-2xl font-bold py-6"
                    >
                        Entendi
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
