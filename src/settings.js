import { PluginSettingTab, Setting } from 'obsidian';

export const DEFAULT_SETTINGS = {
  prompts_folder: 'Prompts',
};

export class SearchlightSettings extends PluginSettingTab {
  constructor(plugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;

    containerEl.empty();

    // TODO: Add autocomplete for settings.prompts_folder
    new Setting(containerEl)
      .setName('Prompts folder location')
      .setDesc('Files in this folder will be available as prompt decks.')
      .addSearch((cb) => {
        // add FolderSuggest from Templater plugin
        cb.setPlaceholder('Example: folder1/folder2')
          .setValue(this.plugin.data.settings.prompts_folder)
          .onChange(async (new_folder) => {
            this.plugin.data.settings.prompts_folder = new_folder;
            await this.plugin.save_data();
          });
      });

    // new Setting(containerEl)
    //   .setName('Sticky prompts')
    //   .setDesc('Prompts will stick to the top of the note.')
    //   .addToggle((toggle) => {
    //       toggle
    //           .setValue(this.plugin.data.settings.prompts_sticky)
    //           .onChange(async (prompts_sticky) => {
    //               this.plugin.data.settings.prompts_sticky =
    //                   prompts_sticky;
    //               await this.plugin.save_data();
    //               this.plugin.toggleStickyPrompts()
    //           });
    //   });
  }
}
