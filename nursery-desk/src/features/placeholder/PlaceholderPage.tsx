import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'

type Props = {
  title: string
  subtitle: string
  phase: string
  nextStep: string
}

export function PlaceholderPage({ title, subtitle, phase, nextStep }: Props) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <Card>
        <p className="mt-0 text-muted">
          This screen is a shell for {phase}. {nextStep}
        </p>
      </Card>
    </>
  )
}
