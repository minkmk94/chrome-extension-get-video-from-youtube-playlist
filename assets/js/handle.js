chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(request)
  if (!request.error) {
    $(document).ready(() => {
      $.fn.dataTable.Buttons.defaults.dom.button.className = '';
      if (!$.fn.dataTable.isDataTable('#data')) {
        $('#data').DataTable({
          preDrawCallback: function (settings) {
            $('#spinner').show();
          },
          drawCallback: function (settings) {
            $('#spinner').hide();
          },
          data: request.data.data,
          columns: [
            { "data": "videoId" },
            { "data": "title" },
            { "data": "channelTitle", "width": "15%" },
            {
              "data": "url",
              "render": (data) => `<a href="${data}">${data}</a>`
            },
            {
              "data": "thumbnail",
              "width": "20%",
              "render": (data, type, row, meta) => {
                let url = data != '' ? data : chrome.extension.getURL('assets/images/not-available.png');
                return type === 'export' ? url : `<a target="blank" href="${row['url']}"><img class="center" src="${url}"/></a>`
              }
            },
          ],
          dom: 'Bfrtip',
          buttons: [
            {
              extend: 'excelHtml5',
              text: "Excel",
              className: 'btn btn-primary',
              title: 'playlist',
              exportOptions: {
                orthogonal: 'export'
              }
            },
            {
              extend: 'csvHtml5',
              text: "CSV",
              className: 'btn btn-primary',
              title: 'playlist',
              exportOptions: {
                orthogonal: 'export'
              }
            },
            {
              extend: 'pdfHtml5',
              text: "PDF",
              className: 'btn btn-primary',
              title: 'playlist',
              exportOptions: {
                orthogonal: 'export'
              }
            }
          ]
        });
      }
    });
  } else {
    alert(request.error.error);
    chrome.tabs.getCurrent(function (tab) {
      chrome.tabs.remove(tab.id, function () { });
    });
  }
});
