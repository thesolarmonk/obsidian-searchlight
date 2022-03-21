<script>
  import { fade } from 'svelte/transition';
  export let prompt = {};
  export let shuffle;
</script>

<!-- TODO: explore prompt card animations -->
<div class="searchlight">
  <div class="searchlight-header" data-index={$prompt.index} on:click={shuffle}>
    <p class="searchlight-header-deck">
      {$prompt.deck === '~quick~' ? '⋆ Searchlight' : $prompt.deck}
    </p>
    {#if $prompt.section}
      <p class="searchlight-header-section">{$prompt.section}</p>
    {/if}
  </div>

  <div class="searchlight-prompt">
    {#if $prompt.result}
      <span transition:fade>{$prompt.result}</span>
    {:else if $prompt.values}
      {#each $prompt.values as segment}
        {#if segment.link}
          <a
            transition:fade
            href={segment.link === 'INTERNAL' ? segment.text : segment.link}
            class:internal-link={segment.link === 'INTERNAL'}
            class:external-link={segment.link !== 'INTERNAL'}
          >
            {segment.text}
          </a>
        {:else}
          <span transition:fade>{segment.text}</span>
        {/if}
      {/each}
    {/if}
  </div>
</div>

<style type="text/scss">
  :global(.searchlight-container) {
    transition: transform 0.3s 0.1s ease !important;

    &:hover {
      border-color: transparent !important;
      transform: translate3d(0, -0.25rem, 0) !important;
    }

    // animation: focus 0.3s ease 0s 1 normal both running !important;

    // @keyframes focus {
    //   0% {
    //     transform: translate(0, -1.25rem) !important;
    //   }

    //   100% {
    //     transform: translate(0, 1.25rem) !important;
    //   }
    // }

    &.searchlight-container--quick {
      :global(.edit-block-button) {
        background-color: var(--background-modifier-border) !important;
      }
    }

    &.searchlight-container--deck {
      :global(.edit-block-button) {
        display: none !important;
      }
    }

    :global(.block-language-prompt) {
      position: relative;

      .searchlight {
        width: 100%;
        height: fit-content;

        position: relative;
        padding: 0 1.25rem;
        border: 0.2rem solid var(--background-modifier-border) !important;
        margin: 0 auto 1rem auto;

        background-color: var(--background-primary-alt) !important;
        border-radius: 0.25rem;
        box-shadow: 0 0 0.5rem 0rem var(--background-primary-alt) !important;

        transition: box-shadow 0.3s 0.1s ease;

        .searchlight-header {
          position: absolute;
          top: -0.05rem;

          width: fit-content;
          padding: 0.1rem 0.75rem 0.2rem 0.75rem;
          border-radius: 0 0 0.25rem 0.25rem;
          background-color: var(--background-modifier-border);

          cursor: pointer;

          display: flex;
          flex-flow: row nowrap;

          user-select: none;

          .searchlight-header-deck,
          .searchlight-header-section {
            margin: 0;

            font-size: 0.75rem;
            font-family: 'iosevka-fixed-400';
            text-transform: uppercase;
          }

          .searchlight-header-section,
          .searchlight-header-section::before {
            opacity: 0.5;
          }

          .searchlight-header-section::before {
            content: '•';
            padding: 0 0.5rem;
          }
        }

        .searchlight-prompt {
          box-sizing: border-box;

          min-height: 3.7rem;
          padding: 1.15rem 0;

          font-style: italic !important;

          .internal-link {
            color: var(-md-color-reslink, --md-color-link, --text-accent) !important;

            text-underline-offset: 1.4px;
            text-decoration: none;
            &:hover {
              text-decoration: underline;
            }
          }
        }
      }
    }
  }
</style>
