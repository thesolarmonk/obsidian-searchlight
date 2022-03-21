import { FuzzySuggestModal } from 'obsidian';

export default class SearchlightModal extends FuzzySuggestModal {
  constructor(plugin, on_choose) {
    super(plugin.app);
    this.app = plugin.app;
    this.plugin = plugin;

    // TODO: Create quick prompt Shift + ↵
    this.emptyStateText = 'No matching prompt decks found. Create a quick prompt with Shift + ↵.';
    // TODO: this.instructions

    this.on_choose = on_choose;
  }

  getItems() {
    const quick_prompt = {
      basename: '~quick~',
      custom: true,
    };

    const prompt_files =
      this.app.vault.getAbstractFileByPath(this.plugin.data.settings.prompts_folder)?.children ||
      [];

    return [quick_prompt, ...prompt_files];
  }

  getItemText(prompts_file) {
    if (prompts_file.custom) {
      return `✧   Create quick prompt   ✧`; // `✧✧✧  〜  Create quick prompt`
    }
    return `[ deck ]  —  ${prompts_file.basename}`; // `▤  —  ${prompts_file.basename}`
  }

  onChooseItem(prompts_file) {
    this.plugin.prompts_deck = prompts_file;
    this.on_choose();
  }
}
