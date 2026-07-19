import emailjs from '@emailjs/browser'

emailjs.init({ publicKey: '0zmlBqpulcs_JyUk9' })

export function sendNotification(title: string, message: string) {
  emailjs.send('salon_service', 'template_c8qegjm', {
    title,
    message,
    time: new Date().toLocaleString('ja-JP'),
  }).catch((e) => console.error('[EmailJS]', e))
}
