import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  "relative flex flex-col gap-6 rounded-2xl transition-all duration-300",
  {
    variants: {
      variant: {
        default:
          "bg-card text-card-foreground border border-border/50 shadow-sm hover:shadow-md hover:border-border",
        glass:
          "glass-card text-card-foreground hover:border-white/20 hover:shadow-lg",
        gradient:
          "bg-gradient-to-br from-card to-muted border border-border/50 hover:shadow-lg hover:border-primary/20",
        glow:
          "bg-card text-card-foreground border border-primary/20 shadow-glow-sm hover:shadow-glow",
        elevated:
          "bg-card text-card-foreground border border-border/30 shadow-lg hover:shadow-xl hover:-translate-y-1",
        flat:
          "bg-secondary/50 text-secondary-foreground border-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      data-slot="card"
      className={cn(cardVariants({ variant, className }))}
      {...props}
    />
  )
)
Card.displayName = "Card"

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

// Gradient border card (Northern Lights style)
const GradientCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative rounded-2xl p-[1px] bg-gradient-to-br from-nl-indigo via-nl-purple to-nl-pink",
      className
    )}
    {...props}
  >
    <div className="relative h-full w-full rounded-2xl bg-card p-6">
      {children}
    </div>
  </div>
))
GradientCard.displayName = "GradientCard"

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  GradientCard,
  cardVariants,
}
