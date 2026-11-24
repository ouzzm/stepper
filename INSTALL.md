# Stepper

Stepper keeps a checklist of release steps for every Azure DevOps ticket, so no step is forgotten
between picking up a ticket and releasing it.

- A small icon appears next to each ticket id in query results and on the work item page:
  empty circle (not started), half-filled circle (in progress), green check (all steps done).
- Click the icon to open the steps panel on the right. Click a step's row to mark it done.
  Click the most recent done step to undo it.
- A step can be a yes/no question (for example "Is this a DB fix?"). Only the steps under the chosen
  answer are added to the ticket.

## Install (Chrome or Edge)

1. Download `stepper-<version>.zip` from https://github.com/ouzzm/stepper/releases/latest and unzip it into
   a folder you will keep (the browser loads the extension from that folder).
2. Open the extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the unzipped folder (the one that contains `manifest.json`).
5. Optional: pin Stepper to the toolbar from the extensions (puzzle) menu.

## Set up

1. Click the Stepper toolbar button. The settings page opens.
2. Under **Azure DevOps address**, enter your Azure DevOps address (for example `https://azure.example.com`)
   and click **Allow**, then accept the browser prompt.
3. Under **Steps**, edit the steps and questions, then click **Save**.
4. Reload any open Azure DevOps tabs.

## Update to a new version

1. Download the new zip from https://github.com/ouzzm/stepper/releases/latest and unzip it over the same folder.
2. On the extensions page, click the reload button on the Stepper card.
3. Reload open Azure DevOps tabs.

Your steps and ticket progress are kept.

## Where the data lives

Steps and ticket progress are stored only in this browser's extension storage. Nothing is sent anywhere.
Clearing the browser cache keeps the data; removing the extension deletes it.
To keep your steps or share them with a teammate, use **Export** on the settings page; **Import** loads such a file
into the editor, and nothing changes until you click **Save**. Ticket progress is not part of the file.
Chrome and Edge keep separate data.
