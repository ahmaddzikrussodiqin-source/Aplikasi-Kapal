# TODO: Edit Ship Preparation Requirements

## Task: Modify InputActivity to copy preparation item to text box when clicked

### Information Gathered:
- In `InputActivity.kt`, the `updatePersiapanListUI` function displays preparation items in a list.
- Each item has a TextView (`tv_item`) and a delete ImageView (`iv_delete`).
- Currently, clicking the delete button removes the item from the list.
- The user wants to click on the TextView to remove the item from the list and copy its text to the `et_persiapan` EditText.

### Plan:
- Modify `updatePersiapanListUI` function in `InputActivity.kt` to add a click listener to `tv_item`.
- When `tv_item` is clicked:
  - Extract the preparation text (remove numbering).
  - Set the text to `et_persiapan`.
  - Remove the item from `listPersiapan`.
  - Update the UI by calling `updatePersiapanListUI` again.

### Dependent Files to be edited:
- `app/src/main/java/com/example/kapallist/InputActivity.kt`

### Followup steps:
- Test the functionality by editing a ship's preparation requirements.
- Ensure the text is copied correctly and the item is removed from the list.
