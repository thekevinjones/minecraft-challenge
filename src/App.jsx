import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import data from './challenges.json'

gsap.registerPlugin(ScrollTrigger)

const STORAGE_KEY = 'eo-minecraft-progress'

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
  } catch {
    return {}
  }
}

const itemKey = (catId, itemIdx) => `${catId}.${itemIdx}`

function categoryKeys(cat) {
  return cat.items.map((_, ii) => itemKey(cat.id, ii))
}

export default function App() {
  const categories = data.categories
  const [progress, setProgress] = useState(loadProgress)
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  }, [progress])

  const toggle = useCallback((key) => {
    setProgress((p) => {
      const next = { ...p }
      if (next[key]) delete next[key]
      else next[key] = true
      return next
    })
  }, [])

  useEffect(() => {
    if (!openId) return
    const onKey = (e) => e.key === 'Escape' && setOpenId(null)
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [openId])

  const openCat = categories.find((c) => c.id === openId) || null

  const scrollToCards = () => {
    const el = document.getElementById('cards')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="page">
      <ScrubHero />

      <main className="content">
        <header className="content__hero">
          <h1 className="hero__title">
            <img
              className="hero__title-img"
              src={`${import.meta.env.BASE_URL}hero-text.png`}
              alt="Eleanor & O’Hara’s Summer Minecraft Extraordinaire"
            />
          </h1>
          <p className="hero__subtitle">Build. Explore. Survive. Imagine.</p>
          <button className="hero__cta" onClick={scrollToCards}>
            Start the Challenge
          </button>
        </header>

        <section className="challenges" id="cards">
          <header className="section-head">
            <h2 className="section-head__title">Choose Your Challenge</h2>
            <p className="section-head__sub">
              Tap a world to open its quests — tick them off as you go. Your progress
              saves automatically.
            </p>
          </header>

          <div className="categories">
            {categories.map((cat) => {
              const keys = categoryKeys(cat)
              const done = keys.filter((k) => progress[k]).length
              const pct = keys.length ? Math.round((done / keys.length) * 100) : 0
              const earned = done === keys.length
              return (
                <button
                  key={cat.id}
                  className={`category-card ${earned ? 'category-card--earned' : ''}`}
                  onClick={() => setOpenId(cat.id)}
                  style={earned ? { '--badge-color': cat.badge.color } : undefined}
                >
                  <div className="category-card__icon">{cat.emoji}</div>
                  <h3 className="category-card__title">{cat.title}</h3>
                  <p className="category-card__blurb">{cat.blurb}</p>
                  <div className="category-card__meter">
                    <div
                      className="category-card__bar"
                      style={{ width: `${pct}%`, background: earned ? cat.badge.color : undefined }}
                    />
                  </div>
                  {earned ? (
                    <p className="category-card__count category-card__badge">
                      <span className="category-card__badge-emoji">{cat.badge.emoji}</span>
                      {cat.badge.label} badge earned!
                    </p>
                  ) : (
                    <p className="category-card__count">
                      {done} / {keys.length} complete
                    </p>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      </main>

      {openCat && (
        <ChallengeModal
          cat={openCat}
          progress={progress}
          toggle={toggle}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  )
}

function ScrubHero() {
  const trackRef = useRef(null)
  const videoRef = useRef(null)
  const cueRef = useRef(null)

  useEffect(() => {
    const track = trackRef.current
    const video = videoRef.current
    if (!track || !video) return

    const ctx = gsap.context(() => {
      // Scrub the video AND pan vertically down through its tall frame together,
      // so we follow the island/waterfall downward as we scroll.
      const state = { t: 0, pan: 0 }
      const setup = () => {
        const duration = video.duration || 15
        video.style.objectPosition = '50% 0%'
        gsap.to(state, {
          t: duration,
          pan: 100,
          ease: 'none',
          scrollTrigger: {
            trigger: track,
            start: 'top top',
            // Finish the pan/scrub exactly as the content sheet covers the viewport.
            end: () => '+=' + (document.querySelector('.content')?.offsetTop || window.innerHeight),
            scrub: 0.5,
          },
          onUpdate: () => {
            if (video.readyState >= 2) {
              video.currentTime = Math.min(state.t, duration - 0.05)
            }
            video.style.objectPosition = `50% ${state.pan}%`
          },
        })
        ScrollTrigger.refresh()
      }

      if (video.readyState >= 1) setup()
      else video.addEventListener('loadedmetadata', setup, { once: true })

      // Scroll cue fades out almost immediately.
      gsap.to(cueRef.current, {
        autoAlpha: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: track,
          start: 'top top',
          end: '12% top',
          scrub: true,
        },
      })
    }, trackRef)

    return () => ctx.revert()
  }, [])

  return (
    <>
      {/* Fixed environment layer that stays behind all content. */}
      <div className="stage">
        <video
          className="scrub"
          ref={videoRef}
          src={`${import.meta.env.BASE_URL}scrub.mp4`}
          muted
          playsInline
          preload="auto"
          tabIndex={-1}
        />
        <div className="vignette" />
      </div>
      <div className="cue" ref={cueRef}>
        <span>Scroll to explore</span>
        <span className="cue__arrow">▾</span>
      </div>
      {/* Transparent intro track: drives the scrub and leaves the opening on pure video. */}
      <div className="scrolltrack" ref={trackRef} />
    </>
  )
}

function ChallengeModal({ cat, progress, toggle, onClose }) {
  const keys = useMemo(() => categoryKeys(cat), [cat])
  const done = keys.filter((k) => progress[k]).length
  const earned = done === keys.length

  return (
    <div className="modal" onClick={onClose}>
      <div
        className="modal__panel"
        onClick={(e) => e.stopPropagation()}
        style={{ '--badge-color': cat.badge.color }}
      >
        <header className="modal__header">
          <div>
            <h2 className="modal__title">
              <span className="modal__emoji">{cat.emoji}</span> {cat.title}
            </h2>
            <p className="modal__blurb">{cat.blurb}</p>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        {earned ? (
          <div className="modal__badge">
            <span className="modal__badge-emoji">{cat.badge.emoji}</span>
            <span>
              You earned the <strong>{cat.badge.label}</strong> badge!
            </span>
          </div>
        ) : (
          <p className="modal__progress">
            {done} of {keys.length} complete — finish them all to earn the{' '}
            <strong>{cat.badge.label}</strong> badge {cat.badge.emoji}
          </p>
        )}

        <div className="modal__body">
          <ul className="group__list">
            {cat.items.map((item, ii) => {
              const key = itemKey(cat.id, ii)
              const checked = !!progress[key]
              return (
                <li key={key}>
                  <label className={`check ${checked ? 'check--done' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(key)}
                    />
                    <span className="check__box" aria-hidden="true" />
                    <span className="check__label">{item}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}
