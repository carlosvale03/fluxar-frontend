"use client"

import { HelpCircle, Info, Sparkles, Target, Zap } from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface HelpSection {
  title: string
  content: string
  icon?: React.ReactNode
}

interface PageHelpProps {
  title: string
  description?: string
  sections: HelpSection[]
  className?: string
}

export function PageHelp({ title, description, sections, className }: PageHelpProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            "h-8 w-8 rounded-full text-muted-foreground hover:text-foreground",
            className
          )}
        >
          <HelpCircle className="h-4 w-4" />
          <span className="sr-only">Ajuda da página</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="overflow-hidden p-0 sm:max-w-[500px]">
        <DialogHeader className="p-8 pb-4 relative">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Info className="w-32 h-32 rotate-12" />
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 ring-1 ring-primary/20 shadow-inner">
            <Sparkles className="h-6 w-6" />
          </div>
          <DialogTitle className="display-m">
            Como funciona: {title}
          </DialogTitle>
          {description && (
            <DialogDescription className="text-sm font-medium mt-2 text-foreground/70">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-8 pb-8">
          <div className="space-y-6 pt-2">
            {sections.map((section, index) => (
              <div key={index} className="space-y-3 rounded-lg border border-border bg-card p-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary group-hover:rotate-12 transition-transform">
                    {section.icon || <Zap className="h-4 w-4" />}
                  </div>
                  <h4 className="label text-foreground">
                    {section.title}
                  </h4>
                </div>
                <p className="text-sm text-foreground/70 leading-relaxed font-medium pl-1">
                  {section.content}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <div className="p-8 pt-4 bg-muted/10 border-t border-border/10">
          <p className="label text-center text-muted-foreground">
            Azimute • Rumo exato para o seu dinheiro
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
