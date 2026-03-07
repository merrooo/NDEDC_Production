# TODO: Add Pagination to Add_Loads Table

## Steps to Complete

1. **Update HTML Template**: Add pagination controls (previous/next buttons, page info) below the table in the `tableTemplate`.

2. **Add Global Variables**: Introduce global variables for full loads array, current page, items per page, and filtered array.

3. **Modify loadModalData Function**: Change to accept an array parameter and display only paginated rows from that array.

4. **Update filterModal Function**: Filter the full loads array, store filtered results, and call loadModalData with filtered array.

5. **Add Pagination Functions**: Implement nextPage, prevPage, goToPage functions to handle navigation.

6. **Update Edit/Save/Delete Functions**: Ensure they update the full array and re-render the current page after changes.

7. **Add CSS Styles**: Style the pagination controls to match the existing design.

8. **Test Functionality**: Verify pagination, search, edit, and delete work correctly together.
