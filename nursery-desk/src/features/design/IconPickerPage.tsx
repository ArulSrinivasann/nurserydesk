import { NavIconPicker } from '@/components/ui/navIconChoices'
import { PageHeader } from '@/components/ui/PageHeader'

export function IconPickerPage() {
  return (
    <>
      <PageHeader
        title="Pick menu icons"
        subtitle="Click one in each group. The sidebar updates straight away. Tell us the numbers you want to keep."
      />
      <NavIconPicker />
    </>
  )
}
