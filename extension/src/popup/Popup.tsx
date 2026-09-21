import ToggleSwitch from './components/ToggleSwitch'
import MetricSlider from './components/MetricSlider'
import Footer from './components/Footer'
import cn from '@/lib/utils'
import { Separator } from "@/components/ui/separator"
import { useSettings } from '@/stores/useSettings'
import Browser from 'webextension-polyfill'

const MIN_THRESHOLD = 30;
const MAX_THRESHOLD = 80;

function Popup() {

  const {onboarding, isEnabled, qualityThreshold} = useSettings();
  if (onboarding) {
    Browser.tabs.create({url: "onboarding.html"})
  }

  return (
    <div className="dark w-full h-full bg-[#101214] text-white flex flex-col overflow-hidden relative font-sans selection:bg-red-500/30">
      <div className="z-10 w-full h-full flex flex-col justify-evenly items-center relative">
          <header className="w-full flex items-center justify-between px-5">
            <div className='flex flex-col'>
              <span className='text-2xl text-sizzle font-google-bold'>Sizzle</span>
              <span className='text-[12px] font-google-semi text-zinc-400 font-semibold -mt-1 uppercase'>YT Comment Classifier</span>
            </div>
            <div className="flex items-center">
              <ToggleSwitch />
            </div>
          </header>

          <Separator className='w-full opacity-50 px-5' />

          {/* Controls: Slider */}
          <div className="w-full flex flex-col items-center gap-2 min-h-0 relative">
            <div className="w-10/12 flex justify-between items-center">
              <label className={cn("text-sm font-google-semi font-bold transition-colors uppercase tracking-widest flex items-center gap-1.5", (!isEnabled) ? "text-zinc-800" : "text-zinc-400 ")}>
                Strictness
              </label>
              <span className={cn(`text-sm font-google-semi font-bold tabular-nums tracking-wide transition-colors`,
                (!isEnabled) ? "text-zinc-800" :
                  (qualityThreshold >= MIN_THRESHOLD && qualityThreshold <= MAX_THRESHOLD)
                    ? 'text-emerald-500'
                    : 'text-red-500')}
              >
                {qualityThreshold}%
              </span>
            </div>
            <div className='w-[90%] flex px-2'>
              <MetricSlider />
            </div>
          </div>
        </div>
        <Footer />
    </div>
  )
}

export default Popup;