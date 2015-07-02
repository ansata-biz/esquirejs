# inquire.js

AMD system for pre-built JavaScript bundles with delayed module provision.

When one of your modules requires another undefined-yet module
- require.js will try to load it
- almond.js will fail

But inquire.js *will wait*.

# Example

Here we have *app* module that depends on *jquery*. But jQuery is not available yet. 
It will be defined later, somewhere in future.

```html
<script type="text/javascript">
  /* Your Application Modules */
  define('app', ['jquery'], function($) {
     alert("We've got jquery!");
     return { init: /* ... */ }; // return "app" module
  });
</script>

<script>
  /* Application Initialization */
  require(['app'], function(App) {
    // will be called when "app" is available (which will resolve after "jquery" is defined)
    App.init(); 
  });
</script>

<script>
  /* Dependency, which will be defined later. Like jQuery or Google Maps */
  setTimeout(function() {
    // 1. link jquery script
    // ...
    // 2. define "jquery" module
    define("jquery", jQuery.noConflict()); // this will resolve "app" module, and *require* call above will complete
  }, 5000);
</script>
```
