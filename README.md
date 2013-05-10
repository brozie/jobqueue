# Brozie's RabbitMQ based Jobqueue


## What is Brozie

Brozie is a new type of browser that makes all websites interactive for the user without registering or installing anything, and the service is completely free. Its framework provides a separate channel of communication for individual websites. Through Brozie, users can talk and share content with each other on the same site in real-time.


## Why does Brozie need a jobqueue system

Brozie has a lot of backend procedure like NewsCloud updating or refresh of friends recommendations. These are important processes but these may take more time than we can do it in realtime. So we thought a lot and made a reliable jobqueue system that can do these tasks in the background.


## Why RabbitMQ

RabbitMQ is written in Erlang and it works asynchronously and that was an important thing when we chose. RabbitMQ implements AMQP (Advanced Message Queuing Protocol) which is a standard message protocol and almost every language has a module that supports it. We use PHP and Node.js based modules. In our decision played a serious role, that RabbitMQ has a fancy webUI.


##How it works

We use Node.js workers because of the pub-sub interface. After starting the server it forks workers based on configs. All workers connect to RabbitMQ and make database connections and other initial functions and after that they listen on queues.

Every type of task has a queue in RabbitMQ and a task source code in a directory called tasks. When a new job gets to the queue, the worker gets it and starts a task with the job's parameters and shared connections. (We use JSON formatted task parameters.) The task process works on the job, insert data to database or convert images and when it ends it calls callback function. If the callback has an error parameter the worker takes the job back to RabbitMQ.

All workers work independently and you can start tasks paralelly.


##Where are the tests

We have a lot but these test only the tasks. Our fault :|


##Experiences and numbers

The Brozie has used this system for 4 months. We have about 15 tasks that makes a lot of database operation and crawler processes. The average load is 2-3000 job/min and the peak was 11000 job/min. Workers' starting memory use is 30 MB/worker and the average is 45-100 MB/worker based on the type of the task.


## License 

(The MIT License)

Copyright (c) 2013 Brozie &lt;dev@brozie.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.