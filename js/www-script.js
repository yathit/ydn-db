/**
 * Script for www.yathit.com
 */


(function() {
  var login_link = document.getElementById('gae-user-login');
  var username = document.getElementById('gae-user-name');
  var contact_form = document.getElementById('contact-form');
  var login_origin = 'https://www.yathit.com';
  if (login_link) {
    var xhr = new XMLHttpRequest();
    // login only work with https
    var url = window.location.href.replace('http:', 'https:');
    xhr.open('GET', login_origin + '/rpc_login?url=' + url, true);
    xhr.withCredentials = true;
    xhr.onload = function(e) {
      if (xhr.status == 200) {
        var json = JSON.parse(xhr.responseText);
        // console.log(json);
        if (!json) {
          return;
        }
        var user = json.User || {};
        var contact_form_msg = document.getElementById('contact-from-message');
        if (user.is_login) {
          login_link.style.display = 'none';
          username.style.display = '';
          username.textContent = user.email;
          if (contact_form) {
            contact_form.style.display = '';
            contact_form_msg.style.display = 'none';
          }
        } else {
          login_link.style.display = '';
          login_link.href = user.login_url;
          login_link.textContent = 'Sign up or Login';
          username.style.display = 'none';
          if (contact_form) {
            contact_form.style.display = 'none';
            contact_form_msg.style.display = '';
          }
        }
      } else {
        username.style.display = 'none';
      }
    };
    xhr.send();
  }

  if (contact_form) {
    var btn = contact_form.querySelector('button');
    btn.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      xhr.open('POST', login_origin + '/contactus', true);
      xhr.withCredentials = true;
      xhr.onload = function(e) {
        if (xhr.status == 200) {
          btn.textContent = 'Thanks!';
        } else {
          btn.textContent = 'Re-send';
          btn.removeAttribute('disabled');
          btn.setAttribute('title', xhr.responseText);
        }
      };
      xhr.setRequestHeader('Content-Type', 'application/json');
      var data = {
        'type': contact_form['type'].value,
        'name': contact_form['name'].value,
        'message': contact_form['message'].value
      };
      xhr.send(JSON.stringify(data));
      btn.textContent = 'Sending ...';
      btn.setAttribute('disabled', '1');
      btn.removeAttribute('title');

    }
  }
})();