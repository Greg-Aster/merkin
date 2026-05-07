<script lang="ts">
type SnuggaloidUnit = {
  id: string
  name: string
  unitId: string
  adoptionStatus: string
  statusLabel: string
  image?: string
  temperament?: string
  size?: string
  exterior?: string
  traits: string[]
  registryNote?: string
  adoptionNote?: string
  warnings: string[]
  easterEgg: boolean
}

export let units: SnuggaloidUnit[] = []

let showRegistry = true
let showAdoption = true

$: visibleUnits = units.filter(unit => {
  if (!showRegistry && !showAdoption) return unit.easterEgg
  if (unit.easterEgg) return false
  return showRegistry || showAdoption
})

$: emptyState =
  !showRegistry && !showAdoption
    ? 'Suppressed record channel open.'
    : 'No Snuggaloids match the selected channel.'
</script>

<div class="flex flex-col gap-4 border-b border-slate-800 pb-5 md:flex-row md:items-end md:justify-between">
  <div>
    <p class="mb-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-cyan-300/80">
      Qarnivor Companion Registry
    </p>
    <h1 class="text-3xl font-black leading-tight text-slate-100 sm:text-4xl">
      Snuggaloid Registry
    </h1>
    <p class="mt-3 max-w-3xl text-sm leading-relaxed text-slate-400">
      Known units, prototype bios, adoption status, and handling notes.
      Registry records can be factual, suspicious, incomplete, or all three.
    </p>
  </div>

  <div id="adoption" class="flex flex-wrap gap-2">
    <button
      type="button"
      class={`rounded-full border px-4 py-2 text-sm font-bold uppercase tracking-[0.08em] transition ${showRegistry ? 'border-cyan-300/60 bg-cyan-900/80 text-cyan-50' : 'border-cyan-300/20 bg-slate-950 text-cyan-200/70 hover:border-cyan-300/50'}`}
      aria-pressed={showRegistry}
      on:click={() => (showRegistry = !showRegistry)}
    >
      Registry
    </button>
    <button
      type="button"
      class={`rounded-full border px-4 py-2 text-sm font-bold uppercase tracking-[0.08em] transition ${showAdoption ? 'border-emerald-300/60 bg-emerald-900/80 text-emerald-50' : 'border-emerald-300/20 bg-slate-950 text-emerald-200/70 hover:border-emerald-300/50'}`}
      aria-pressed={showAdoption}
      on:click={() => (showAdoption = !showAdoption)}
    >
      Adoption
    </button>
  </div>
</div>

<section id="registry" class="scroll-mt-24 pt-6">


  <p class="mb-4 text-sm text-slate-500">
    {visibleUnits.length} record{visibleUnits.length === 1 ? '' : 's'} visible
  </p>

  {#if visibleUnits.length > 0}
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {#each visibleUnits as unit}
        <article
          class={`overflow-hidden rounded-2xl border bg-slate-900/80 ${unit.easterEgg ? 'border-fuchsia-300/40 shadow-2xl shadow-fuchsia-950/30' : 'border-slate-800'}`}
        >
          {#if unit.image}
            <img
              src={unit.image}
              alt={unit.name}
              class="h-56 w-full object-cover"
              loading="lazy"
            />
          {:else}
            <div class="grid h-56 place-items-center bg-slate-950 text-xs font-bold uppercase tracking-[0.18em] text-slate-600">
              No Photo
            </div>
          {/if}
          <div class="grid gap-4 p-4">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  {unit.unitId}
                </p>
                <h3 class="mt-1 text-xl font-black text-slate-100">
                  {unit.name}
                </h3>
              </div>
              <span
                class={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${unit.easterEgg ? 'bg-fuchsia-300/15 text-fuchsia-100' : 'bg-cyan-300/15 text-cyan-100'}`}
              >
                {unit.statusLabel}
              </span>
            </div>

            <dl class="grid gap-3 text-sm">
              {#if unit.temperament}
                <div>
                  <dt class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Temperament</dt>
                  <dd class="mt-1 text-slate-300">{unit.temperament}</dd>
                </div>
              {/if}
              {#if unit.size}
                <div>
                  <dt class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Size</dt>
                  <dd class="mt-1 text-slate-300">{unit.size}</dd>
                </div>
              {/if}
              {#if unit.exterior}
                <div>
                  <dt class="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Exterior</dt>
                  <dd class="mt-1 text-slate-300">{unit.exterior}</dd>
                </div>
              {/if}
            </dl>

            {#if unit.traits.length > 0}
              <div class="flex flex-wrap gap-1.5">
                {#each unit.traits as trait}
                  <span class="rounded-full bg-slate-950 px-2 py-1 text-xs text-slate-400">
                    {trait}
                  </span>
                {/each}
              </div>
            {/if}

            {#if unit.registryNote}
              <p class="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm leading-relaxed text-slate-400">
                {unit.registryNote}
              </p>
            {/if}

            {#if showAdoption && unit.adoptionNote}
              <p class="rounded-xl border border-emerald-300/20 bg-emerald-950/30 p-3 text-sm leading-relaxed text-emerald-100/80">
                {unit.adoptionNote}
              </p>
            {/if}

            {#if unit.warnings.length > 0}
              <div class="rounded-xl border border-amber-300/20 bg-amber-950/20 p-3">
                <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200/80">
                  Warnings
                </p>
                <ul class="mt-2 grid gap-1 text-sm text-amber-100/75">
                  {#each unit.warnings as warning}
                    <li>{warning}</li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
        </article>
      {/each}
    </div>
  {:else}
    <p class="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-400">
      {emptyState}
    </p>
  {/if}
</section>
