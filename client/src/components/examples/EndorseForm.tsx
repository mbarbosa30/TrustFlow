import { EndorseForm } from '../EndorseForm'

export default function EndorseFormExample() {
  return (
    <div className="max-w-2xl">
      <EndorseForm
        onEndorse={(endorsee, level, note) => {
          console.log('Endorsement:', { endorsee, level, note });
        }}
      />
    </div>
  )
}
